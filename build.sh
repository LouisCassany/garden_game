#!/bin/bash

npm run build
ssh -t home "rm -rf /home/louis/production/garden/*"
ssh -t home "systemctl stop garden.service"
ssh -t home "systemctl daemon-reload"
rsync -rz .output/ home:/home/louis/production/garden/
ssh -t home "systemctl start garden.service"