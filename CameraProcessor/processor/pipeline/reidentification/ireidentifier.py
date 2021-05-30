""" Contains reidentification interface

This program has been developed by students from the bachelor Computer Science at
Utrecht University within the Software Project course.
© Copyright Utrecht University (Department of Information and Computing Sciences)

"""

class IReIdentifier():
    """Superclass for identifiers.
    """

    def extract_features(self, frame_obj, track_obj):
        """Given a det_obj object, extract the features of it.

        Args:
            frame_obj (FrameObj): frame object storing OpenCV frame and timestamp.
            track_obj (BoundingBoxes): BoundingBoxes object that has the bounding boxes of the tracking stage

        Returns:
            float[]: returns the feature vectors of the tracked objects.
        """
        raise NotImplementedError("Extract features function not implemented")

    def re_identify(self, frame_obj, track_obj, re_id_data):
        """ Performing re-identification using torchreid to possibly couple bounding boxes to a tracked subject
        which is not currently detected on the camera. Updates list of bounding box by possibly assigning an object ID
        to an existing bounding box. Does not return anything, just updates the existing list.

        Args:
            frame_obj (FrameObj):  frame object storing OpenCV frame and timestamp.
            track_obj (BoundingBoxes): List of bounding boxes from tracking stage
            list has to be of the same length as the list of bounding boxes in track_obj, and ordered in the same
            way (feature vector i belongs to box i).
            re_id_data (ReidData): Data class containing data about tracked subjects
        """
        raise NotImplementedError("Reidentification function not implemented")