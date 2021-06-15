"""Contains tracking interface for sort based trackers.

This program has been developed by students from the bachelor Computer Science at
Utrecht University within the Software Project course.
© Copyright Utrecht University (Department of Information and Computing Sciences)
"""
import numpy as np

from processor.data_object.bounding_box import BoundingBox
from processor.pipeline.tracking.i_tracker import ITracker
from processor.data_object.bounding_boxes import BoundingBoxes
from processor.data_object.rectangle import Rectangle


class ISortTracker(ITracker):
    """Tracker interface SORT trackers.

    Contains a generic implementation for a generic sort tracker.
    """

    def execute_component(self):
        """Function given to scheduler, so the scheduler can run the tracking stage.

        Returns:
            function: function that the scheduler can run.
        """
        return self.track

    def track(self, frame_obj, detection_boxes, re_id_data):
        """Performing tracking using a SORT tracking implementation to get a tracking ID for all tracked detections.

        Args:
            frame_obj (FrameObj): frame object storing OpenCV frame and timestamp.
            detection_boxes (BoundingBoxes): BoundingBoxes object that has the bounding boxes of detection stage
            re_id_data (ReidData): Object containing data necessary for re-identification.

        Raises:
            NotImplementedError: Track function is not implemented for a generic tracker.
        """
        raise NotImplementedError("Detect function not implemented")

    @staticmethod
    def parse_boxes_from_sort(tracked_boxes, shape, re_id_data):
        """Parses the boxes from sort into the correct format.

        Args:
            tracked_boxes ([BoundingBox]): Boxes generated by the sort tracker.
            shape (int, int): Width and height of the image
            re_id_data (ReidData): Object containing data necessary for re-identification.

        Returns:
            [BoundingBox]: object containing all trackers (bounding boxes of tracked objects).
        """
        bounding_boxes = []
        width, height = shape

        # Parse each box.
        for box in tracked_boxes:
            bounding_box = BoundingBox(
                identifier=int(box[0][4]),
                rectangle=Rectangle(
                    max(int(box[0][0]) / width, 0),
                    max(int(box[0][1]) / height, 0),
                    min(int(box[0][2]) / width, 1),
                    min(int(box[0][3]) / height, 1),
                ),
                classification=box[1],
                certainty=box[2],
                object_id=re_id_data.get_object_id_for_box(int(box[0][4]))
            )
            bounding_boxes.append(bounding_box)

        return BoundingBoxes(bounding_boxes)

    @staticmethod
    def convert_boxes_to_sort(detection_boxes, shape):
        """Converts the bounding boxes to the format used by sort.

        Args:
             detection_boxes ([BoundingBox]): A list of bounding boxes from our detection method
             shape (int, int): Width and height of the image

        Returns:
            (np.array, string, float): A numpy array for the bounding box, a string for the
                classification and a float for the certainty,
        """
        width, height = shape
        sort_detections = []

        for bounding_box in detection_boxes:
            # Include box, classification, and certainty.
            sort_detections.append((np.asarray([
                bounding_box.rectangle.x1 * width,
                bounding_box.rectangle.y1 * height,
                bounding_box.rectangle.x2 * width,
                bounding_box.rectangle.y2 * height,
                bounding_box.certainty]),
                bounding_box.classification,
                bounding_box.certainty))
        return sort_detections
