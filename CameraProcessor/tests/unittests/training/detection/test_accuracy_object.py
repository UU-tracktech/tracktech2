"""Test accuracy object to the extend that it is possible

This program has been developed by students from the bachelor Computer Science at
Utrecht University within the Software Project course.
© Copyright Utrecht University (Department of Information and Computing Sciences)

"""

import os
import pytest

from processor.training.detection.accuracy_object import AccuracyObject
from processor.data_object.bounding_box import BoundingBox
from processor.data_object.rectangle import Rectangle


class TestAccuracyObject:
    """Test the accuracy object

    """
    @staticmethod
    def init_correct(accuracy_object):
        """Tests if the object is initialized correctly

        Args:
            accuracy_object (AccuracyObject): Object containing the accuracy information
        """
        # Test if the IOU Threshold has a valid value
        assert accuracy_object.iou_threshold >= 0
        assert accuracy_object.iou_threshold <= 1

        # Test if the ground truth contains an amount of frames that is strictly larger then 0
        assert accuracy_object.frame_amount > 0

        # Test if the image width and height have valid values and are read correctly
        assert accuracy_object.image_width > 0 and accuracy_object.image_height > 0
        assert accuracy_object.image_width < 10000 and accuracy_object.image_height < 10000

    # pylint: disable=consider-iterating-dictionary
    @pytest.mark.skip("Rectangle coords should be normalized in pre_annotations.py")
    def test_detection(self, configs):
        """Tests if the detection done by the library produces possible results

        Args:
            The configuration of the tests
        """
        # Making the accuracy object
        accuracy_object = AccuracyObject(configs)

        # Reading the detection file and making the dictionary with results
        accuracy_object.detect()

        self.init_correct(accuracy_object)
        self.draw_plots(accuracy_object)

        # Checking for some values in the dictionary if they are possible
        for key in accuracy_object.results.keys():
            # Getting the detections for one class of objects
            metrics_for_detection_class = accuracy_object.results[key]

            # Checking if the metrics have valid values
            assert metrics_for_detection_class.tp >= 0
            assert metrics_for_detection_class.fp >= 0
            assert metrics_for_detection_class.tp <= len(accuracy_object.bounding_boxes_gt)
            assert metrics_for_detection_class.get_mAP(accuracy_object.results) <= 1
            assert metrics_for_detection_class.get_mAP(accuracy_object.results) >= 0

    def test_parse_boxes(self, configs):
        """Tests if the boxes are parsed correctly

        Args:
            configs (ConfigParser): The configurations of the test
        """
        # Making the accuracy object
        accuracy_object = AccuracyObject(configs)

        # Making 3 bounding boxes
        rectangle1 = Rectangle(0.1, 0.1, 0.2, 0.2)
        box1 = BoundingBox(-1, rectangle1, "", 0.5)

        rectangle2 = Rectangle(0, 0, 0.3, 0.3)
        box2 = BoundingBox(-1, rectangle2, "", 0.7)

        rectangle3 = Rectangle(0.2, 0.2, 0.6, 0.6)
        box3 = BoundingBox(-1, rectangle3, "", 0.9)

        # Putting the boxes into frames
        frame1 = [box1]
        frame2 = [box2, box3]

        # Putting the frames into the format that we get from the preAnnotations
        boxes = [frame1, frame2]

        # Setting the width, height and number of frames so that the output can be checked independent on the current
        # info in the config
        accuracy_object.image_width = 100
        accuracy_object.image_height = 100

        # Parsing the boxes
        parsed_boxes = accuracy_object.parse_boxes(boxes)

        # Checking in box1 is correct
        parsed_box = parsed_boxes[0]
        assert parsed_box.xtl * accuracy_object.image_width == 0.1\
               and parsed_box.ytl * accuracy_object.image_height == 0.1
        assert parsed_box.xbr * accuracy_object.image_width == 0.2\
               and parsed_box.ybr * accuracy_object.image_height == 0.2
        assert parsed_box.score == 0.5
        assert parsed_box.image_name == "0"

        # Checking in box2 is correct
        parsed_box = parsed_boxes[1]
        assert parsed_box.xtl * accuracy_object.image_width == 0\
               and parsed_box.ytl * accuracy_object.image_height == 0
        assert parsed_box.xbr * accuracy_object.image_width == 0.3\
               and parsed_box.ybr * accuracy_object.image_height == 0.3
        assert parsed_box.score == 0.7
        assert parsed_box.image_name == "1"

        # Checking in box3 is correct
        parsed_box = parsed_boxes[2]
        assert parsed_box.xtl * accuracy_object.image_width == 0.2\
               and parsed_box.ytl * accuracy_object.image_height == 0.2
        assert parsed_box.xbr * accuracy_object.image_width == 0.6\
               and parsed_box.ybr * accuracy_object.image_height == 0.6
        assert parsed_box.score == 0.9
        assert parsed_box.image_name == "1"

    def draw_plots(self, accuracy_object):
        """Draws the plots and checks whether files are indeed created

        Args:
            accuracy_object (AccuracyObject): Accuracy object containing all the data
        """
        plots_path = accuracy_object.accuracy_config['plots_path']
        if os.path.exists(plots_path):
            number_files = len(os.listdir(plots_path))
        else:
            number_files = 0

        # Create the plots and verify the folder contains more
        accuracy_object.draw_all_pr_plots()

        assert len(os.listdir(plots_path)) > number_files
