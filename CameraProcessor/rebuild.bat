set imageName=camera-processor-yolov5
set containerName=camera-processor-yolov5-container

:: Remove old container
docker rm -f %containerName%

:: Create new image
docker build -t %imageName% .

:: Remove dangling images
docker image prune -f

:: Run new container...
docker run -t -d --gpus all --name %containerName% %imageName%
:: docker run -t -d --name %containerName% %imageName%

Pause