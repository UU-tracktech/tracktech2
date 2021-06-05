"""Tests Rectangle by checking properties.

This program has been developed by students from the bachelor Computer Science at
Utrecht University within the Software Project course.
© Copyright Utrecht University (Department of Information and Computing Sciences)
"""
import pytest
from processor.data_object.rectangle import Rectangle


# pylint: disable=attribute-defined-outside-init,no-member
def __eq__(self, other):
    """Custom equalize function for rectangles.

    Args:
        other (Rectangle): second rectangle to compare current object to.

    Returns:
        bool: Whether the two rectangles are equal.
    """
    if isinstance(self, other.__class__):
        return self.a == other.a and self.b == other.b
    return False


class TestRectangle:
    """Testing Rectangle.

    Attributes:
        data (Rectangle): Example rectangle.
        tlx1 (float): Top left corner x coordinate.
        tly1 (float): Top left corner y coordinate.
        brx2 (float): Bottom right corner x coordinate.
        brx2 (float): Bottom right corner y coordinate.
    """
    def setup_method(self):
        """Setup method."""
        self.data = Rectangle(0, 0, 1, 1)
        self.tlx1 = self.data.x1
        self.tly1 = self.data.y1
        self.brx2 = self.data.x2
        self.bry2 = self.data.y2

    def test_x1_value(self):
        """Tests x1 value."""
        assert self.tlx1 == 0

    def test_y1_value(self):
        """Tests y1 value."""
        assert self.tly1 == 0

    def test_x2_value(self):
        """Tests x2 value."""
        assert self.brx2 == 1

    def test_y2_value(self):
        """Tests y2 value."""
        assert self.bry2 == 1

    def test_rectangle(self):
        """Tests entire Rectangle object."""
        assert self.data.__eq__(Rectangle(0, 0, 1, 1))
        assert Rectangle(self.tlx1, self.tly1, self.brx2, self.bry2).__eq__(Rectangle(0, 0, 1, 1))

    def test_invalid_x1(self):
        """Tests whether an error is raised when the x1 is smaller than 0."""
        with pytest.raises(ValueError):
            assert Rectangle(-0.1, 0, 0, 0)

    def test_invalid_y1(self):
        """Tests whether an error is raised when the y1 is smaller than 0."""
        with pytest.raises(ValueError):
            assert Rectangle(0, -0.1, 0, 0)

    def test_invalid_x2(self):
        """Tests whether an error is raised when the x2 is bigger than 1."""
        with pytest.raises(ValueError):
            assert Rectangle(0, 0, 1.1, 0)

    def test_invalid_y2(self):
        """Tests whether an error is raised when the y2 is bigger than 1."""
        with pytest.raises(ValueError):
            assert Rectangle(0, 0, 0, 1.1)


if __name__ == '__main__':
    pytest.main(TestRectangle)
