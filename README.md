## Phenix Molstar
Phenix implementation of the [Mol* viewer](https://molstar.org). Minimal changes have been made to the default viewer, but the entire project is forked for simplicity. Full installation options for molstar are described in the original readme file [README_MOLSTAR.md](README_MOLSTAR.md)

## Install

### Clone into existing qttbx directory 
(under your local Phenix installation location)
```bash
cd ~/phenix/modules/cctbx_project/qttbx/
git clone https://github.com/phenix-project/phenix-molstar/
cd phenix-molstar
```

## Install node.js
1. First verify you don't have node.js. If ```node -v``` and ```npm -v``` print a version you already have it. For best results use the latest version. If the version is too low (<14), this application will definitely not work. 
####MacOS
2. Go to [https://nodejs.org/](https://nodejs.org/) and download the .pkg file. Install it

#### Linux
2. Consider [nodesource]([https://nodejs.org/](https://github.com/nodesource/)). 

3. Verify installation with ```node -v```. This should also install npm, the node package manager. Verify with ```npm -v```
4. Install the http server with ```npm install http-server``` 

### Build the Molstar app
```JS
npm install
npm run build
```

### Run standalone
Serve the contents of 'build/apps/viewer/' and view with a web browser. To run locally with defaults:
```bash
npm run serve
```





