import threading
import time
import logging
import json
from typing import List
import ffmpeg
import cv2
from src.input.icapture import ICapture


class HlsCapture(ICapture):
    """Implementation of the ICapture class which handles an HLS stream with timestamps.

    Main thread runs the implementation with open, close and getting the next frame.
    Seperate thread runs the reading loop, which reads the next frame at a constant rate.
    Another thread gets the time stamp of the stream once and going from there.
    """
    def __init__(self, hls_url='http://81.83.10.9:8001/mjpg/video.mjpg'):
        """Initiates the capture object with a hls url and starts reading frames

        Default hls_url is of a public stream that is available 24/7

        Args:
            hls_url: Url the videocapture has to connect to
        """

        # Stream related properties
        self.hls_url = hls_url
        self.cap = None
        self.cap_initialized = False

        # Time stamps
        self.start_time_stamp = 0
        self.frame_time_stamp = 0
        self.last_frame_time_stamp = 0
        self.hls_start_time_stamp = 0

        # Time
        self.thread_start_time = 0
        self.wait_ms = 0

        # Frame numbers
        self.current_frame = 0
        self.current_frame_nr = 0

        # Create thread that syncs streams
        self.thread = threading.Thread(target=self.sync)
        self.thread.daemon = True
        self.thread.start()

        # Reconnect with timeout
        timeout_left = 10
        sleep = 1
        # Sleep is essential so processor has a prepared self.cap
        while not self.cap_initialized and timeout_left > 0:
            logging.info("Waiting 1 seconds before rechecking if stream is opened..")
            time.sleep(sleep)
            timeout_left -= sleep

        # Raise error when capture is never created in other thread
        if not self.cap_initialized:
            logging.error("cv2.VideoCapture probably raised exception")
            raise TimeoutError("HLS Capture never opened")

    def opened(self) -> bool:
        """Check whether the current capture object is still opened

        Returns:
            Whether stream is still opened at this point of time
        """
        if self.cap:
            return self.cap.isOpened()
        return False

    # When everything is done release the capture
    def close(self) -> None:
        """Closes the capture object and the thread that is responsible
        for serving the current frame
        """
        logging.info('HLS stream closing')
        self.thread.join()
        self.cap.release()

    def get_next_frame(self) -> (bool, List[List[int]], float):
        """Gets the next frame from the hls stream

        Returns:
            Boolean whether a new frame has been returned compared to the previous one.
            Frame which is the current frame to be processed.
            Timestamp of the current frame given back by the method.
        """
        # Frame is not different from the last one
        if self.frame_time_stamp == self.last_frame_time_stamp:
            return False, None, None
        self.last_frame_time_stamp = self.frame_time_stamp
        return True, self.current_frame, self.frame_time_stamp

    def read(self) -> None:
        """Method that runs in seperate thread that goes through the frames of the
        stream at a consistent pace

        Reads frames at frame rate of the stream and puts them in self.current_frame
        Calculates at what time the next frame is expected and waits that long
        """
        while True:
            # Reads next frame
            ret, self.current_frame = self.cap.read()

            # If frame was not yet ready
            if not ret:
                continue
            self.current_frame_nr += 1

            # What is the wait time until next frame has to be prepared
            expected_next_frame_time = self.wait_ms * self.current_frame_nr
            time_into_stream = time.time() - self.thread_start_time
            wait_time = int(expected_next_frame_time - time_into_stream * 1000)

            # Saves timestamp and waits calculated amount
            self.frame_time_stamp = self.hls_start_time_stamp + time_into_stream

            # Next frame should already have been read
            if wait_time <= 0:
                continue

            cv2.waitKey(wait_time)

    def sync(self) -> None:
        """Method to instantiate the video connection with the HLS stream

        Makes a separate thread to request meta-data and sets the default values for the variables
        """
        logging.info(f'Connecting to HLS stream, url: {self.hls_url}')

        # Starts a separate thread to request meta-data
        threading.Thread(target=self.get_meta_data).start()

        # Instantiates the connection with the hls stream
        self.cap = cv2.VideoCapture(self.hls_url)
        self.cap_initialized = True

        # Saves the current time of a successful established connection
        self.thread_start_time = time.time()

        logging.info('Opened HLS stream')

        # Get the FPS of the hls stream and turn it into a delay of when
        # each frame should be displayed
        self.wait_ms = 1000 / self.cap.get(cv2.CAP_PROP_FPS)
        self.read()

    def get_meta_data(self) -> None:
        """Make a http request with ffmpeg to get the meta-data of the HLS stream,
        """
        # extract the start_time from the meta-data to get the absolute segment time
        logging.info('Retrieving meta data from HLS stream')
        # pylint: disable=no-member
        meta_data = ffmpeg.probe(self.hls_url)
        # pylint: enable=no-member
        try:
            self.hls_start_time_stamp = float(meta_data['format']['start_time'])
        # Json did not contain key
        except KeyError as e:
            logging.warning(f'Json does not contain keys for {e}')

    def to_json(self):
        """Converts HLS URL into JSON with correct type included."""
        return json.dumps({"type": "identifier", "id": self.hls_url})
