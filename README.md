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
1. First verify you don't have node.js. If ```node -v``` prints a version you already have it
2. Go to [https://nodejs.org/](https://nodejs.org/) and download the .pkg file
3. Install the .pkg file by following the prompts
4. Verify installation with ```node -v```. This should also install npm, the node package manager. Verify with ```npm -v```

### Install Molstar
```JS
npm install
npm run build
```

### Run
Serve the contents of 'build/apps/viewer/' and view with a web browser. To run locally with defaults:
```bash
npm run serve
```





