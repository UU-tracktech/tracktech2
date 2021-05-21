"""Detection abstract class

This program has been developed by students from the bachelor Computer Science at
Utrecht University within the Software Project course.
© Copyright Utrecht University (Department of Information and Computing Sciences)

"""
from processor.scheduling.component.component_interface import IComponent


class IDetector(IComponent):
    """Detection runner interface that can be run as Scheduler component.
    """

    def execute_component(self):
        """See base class."""
        super().execute_component()

    def detect(self, frame_obj):
        """Given a frame object, run detection algorithm to find all bounding boxes of objects within frame.

        Args:
            frame_obj (FrameObj): object containing frame and timestamp.

        Returns:
            BoundingBoxes: returns BoundingBoxes object containing a list of BoundingBox objects
        """
        raise NotImplementedError("Detect function not implemented")
