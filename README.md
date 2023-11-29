## Phenix Molstar
Phenix implementation of the [Mol* viewer](https://molstar.org). Minimal changes have been made to the default viewer, but the entire project is forked for simplicity. Full installation options for molstar are described in the original readme file [README_MOLSTAR.md](README_MOLSTAR.md)

## Install

### Clone into existing qttbx directory
```bash
cd $LIBTBX_BUILD/../modules/cctbx_project/qttbx/
git clone https://github.com/phenix-project/phenix-molstar/
cd phenix-project
```

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





