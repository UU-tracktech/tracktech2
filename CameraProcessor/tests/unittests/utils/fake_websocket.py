"""Mock websocket for testing.

This program has been developed by students from the bachelor Computer Science at
Utrecht University within the Software Project course.
© Copyright Utrecht University (Department of Information and Computing Sciences)

"""
import json
from collections import deque


class FakeWebsocket:
    """A fake websocket that implements the same methods but just mocks some functionality

    """
    def __init__(self):
        self.message_queue = deque()

    def write_message(self, message):
        """Takes a message and asserts if it has the correct type property

        Args:
            message: a JSON object
        """
        msg = json.loads(message)
        assert msg["type"] == 'boundingBoxes'