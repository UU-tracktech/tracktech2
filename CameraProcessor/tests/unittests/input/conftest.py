"""Fixtures and configurations available to other capture unit tests

This program has been developed by students from the bachelor Computer Science at
Utrecht University within the Software Project course.
© Copyright Utrecht University (Department of Information and Computing Sciences)

"""
import pytest

from processor.input.hls_capture import HlsCapture
from processor.input.video_capture import VideoCapture
from processor.input.image_capture import ImageCapture

from tests.conftest import get_test_configs


def __get_images_dir():
    """Get the path to the images directory.

    Returns: a string containing the file path to the image folder.

    """
    configs = get_test_configs()
    return configs['Accuracy']['source_path']


def __get_video_path():
    """Get the path to a video

    Returns: a string containing the file path to a video

    """
    configs = get_test_configs()
    return configs['Yolov5']['source_path']


# pylint: disable=unnecessary-lambda
@pytest.fixture(scope="class",
                params=[lambda: ImageCapture(__get_images_dir()),
                        lambda: VideoCapture(__get_video_path()),
                        lambda: HlsCapture()
                        ],
                ids=["Image",
                     "video",
                     "HLS Stream"
                     ])
def capture_implementation(request):
    """ Defines capture_implementation as multiple implementations of iCapture,
    to be use in generic capture tests.

    Args:
        request: different implementations of capture.

    Returns: implementation of capture.

    """
    return request.param
