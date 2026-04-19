#!/usr/bin/env bash
cd ~/test22.dcism.org/biocella
pm2 resurrect || pm2 start ecosystem.config.cjs --env production
