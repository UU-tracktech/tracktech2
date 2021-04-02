from src.websocket_client import WebsocketClient
import pytest
import os
import json
import tornado
from utils.jsonloader import load_random_data
from async_timeout import timeout

# Talks to orchestrator

# Sends all possible API calls to orchestrator
# Asserts that no message is sent back to current processor

url = 'ws://processor-orchestrator-test-service/processor'
url = 'ws://localhost:80/processor'


class TestSendToOrchestrator:

    ws_client = WebsocketClient(url)

    async def setup_method(self):

        await self.ws_client.connect()

    def with_timeout(t):
        """Time out function for testing

        Args:
            t: seconds as integer

        Returns: async timer

        """

        def wrapper(corofunc):
            async def run(*args, **kwargs):
                with timeout(t):
                    return await corofunc(*args, **kwargs)

            return run

        return wrapper

    @pytest.mark.asyncio
    @with_timeout(10)
    async def test_confirm_connection(self):
        """Confirms connection with websocket

        """

        assert self.ws_client.connection

    #@pytest.fixture(params=[1, 10])
    def test_send_x_valid_boundingbox_data(self):
        """Sends valid boundingbox entry

        """
        m = load_random_data('boundingBoxes', 1)
        self.ws_client.write_message((json.dumps(m[0])))

    #@pytest.fixture(params=[1, 10])
    def test_send_x_valid_featuremap_data(self):
        """Sends valid data entry for bounding boxes

        """
        m = load_random_data('featureMap', 1)
        self.ws_client.write_message((json.dumps(m[0])))


    def test_send_single_invalid_data(self):
        """Sends single invalid data entry

        """
        pass

    def test_send_9_valid_1_invalid(self):
        """Sends multiple valid data entries and one invalid data entry.

        """
        pass

    def test_speed_test(self):
        """Speed tests

        """
        pass


if __name__ == '__main__':
    pytest.main(TestSendToOrchestrator)
