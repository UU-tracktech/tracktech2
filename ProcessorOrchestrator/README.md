# Processor Orchestrator

This component is responsible for managing communications between camera processor
and interfaces using websockets.

## Architecture
The architecture of the application is made up of the following main components:
- main.py: starts the server and handles routing to handlers.
- client_socket.py: contains the websocket handler for clients.
- processor_socket.py: contains the websocket handler for processors.
- object_manager.py: contains a class for tracking objects that contains the identifier, feature map, and functionality 
  for automatic stopping of tracking.
- connections.py: contains dictionaries for the currently connected sockets.
- logger.py: contains methods for standardized logging.
- timeline_handler.py: contains HTTP Handler that serves timeline tracking info of a specified object.

## How to use
There are two ways to start the server:
- run "python src/main.py" with the current folder as the python root path and after installing the packages in requirements.txt
- (using docker) run "docker-compose up"

### Dependencies
Dependencies for running the main application are listed in requirements.txt; 
dependencies for running the tests are listed in requirements-test.txt. All dependencies
should be installed with pip.

### Environment variables
The following environment variables can be used:

| Variable         | Description                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------ |
| SSL_CERT         | A SSL certificate that should be used to create secure websockets.                         |
| SSL_KEY:         | The private key for the given SSL certificate.                                             |
| PUBLIC_KEY       | The public key used for authentication.                                                    |
| AUDIENCE         | The token audience.                                                                        |
| CLIENT_ROLE      | The role that should be present in tokens for access to the client socket.                 |
| PROCESSOR_ROLE   | The role that should be present in tokens for access to the processor socket.              |
| TRACKING_TIMEOUT | The optional time in seconds after which an object should automatically stop being tracked |

## Communications
Communication with the orchestrator can be done over 2 websocket handlers channels:
- ws(s)://HOST/client
- ws(s)://HOST/processor

Both sockets expect messages in json format. A message should contain at least a 
"type" property, which specifies the type of the message. The server does not respond if the 
type is unknown.

### Client
The client websocket knows the following types of messages:
- "start": This command is used to start the tracking of an object in the specified frame,
  needs the following additional properties:
  - "cameraId": The identifier of the processor on which the bounding box of the object to be tracked
    was computed.
  - "frameId": The identifier of the frame on which the bounding box of the object to be tracked
    was computed.
  - "boxId": The identifier of the bounding box computed for the object to be tracked.
  - "image": A serialised image that can be used by the processor for re-identification.

  Of these properties, it is required that at least the "image" parameter, or, a combination of the "frameId" and "boxId" 
  parameters are sent.
- "stop" | This command is used to stop the tracking of an object,
  needs the following additional properties:
  - "objectId" | The identifier of the object which should no longer be tracked.
    
### Processor
The processor websocket knows the following types of messages:
- "identifier": This signifies a message containing the identifier by which this processor
  should be identified, needs the following additional properties:
  - "id" | The identifier of the processor under which this socket should be registered.
- "boundingBoxes": This signifies a message that contains bounding boxes, 
  needs the following additional properties:
  - "frameId" | The identifier of the frame for which these bounding boxes were computed.
  - "boxes"   | An object containing the bounding boxes that were computed for this frame.
- "featureMap": This signifies a message that contains a feature map of an object,
  needs the following additional properties:
  - "objectId"   | The identifier of the object for which this feature map was computed.
  - "featureMap" | An object containing the new feature map that was computed.
  
### Tracking Timelines
Finally, there is also a http handler that serves logging data of a given object.
This data is located at 
- http(s)://HOST/timelines?object_id=ID

where ID is the id of the object of which the timeline is required.  
Timeline tracking data is returned as a json with one property "data" that contains
an array of objects with a "timeStamp" property, and a "processorId" property containing the id of the
processor on which the object was detected.

## Running tests
The project contains two testing stages, unit testing and integration testing.
Tests should be run through docker compose, as they may rely on other services which are handled in the compose file.
The stages can be run as follows:
- Unit testing: run "docker-compose -f compose/docker-compose_test_unit.yml"
- Integration testing: run "docker-compose -f compose/docker-compose_test_integration.yml"
