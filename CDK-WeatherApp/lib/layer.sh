
export PYTHON_VERSION=`python3 -c 'import sys; version=sys.version_info[:3]; print("{0}.{1}".format(*version))'`
export VIRTUAL_ENV_DIR="pandas-virtualenv"
export LAMBDA_LAYER_DIR="pandas-lambda-layer"
export ZIP_FILE_NAME="pandas-lambda-layer.zip"
mkdir ${VIRTUAL_ENV_DIR}
sudo virtualenv -p python3 ${VIRTUAL_ENV_DIR}
cd ${VIRTUAL_ENV_DIR}/bin/
source activate
sudo pip install pandas #requests awscli bokeh matplotlib pandas
deactivate
cd ../..
mkdir ${LAMBDA_LAYER_DIR}
cd ${LAMBDA_LAYER_DIR}
cp ../${VIRTUAL_ENV_DIR}/bin/aws .
cp -r ../${VIRTUAL_ENV_DIR}/lib/python3.12/site-packages/* .
zip -r ../${ZIP_FILE_NAME} *
cd ..
sudo rm -r ${VIRTUAL_ENV_DIR}
sudo rm -r ${LAMBDA_LAYER_DIR}
