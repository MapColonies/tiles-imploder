# Tiles Imploder
The goal is to cut a specific bounding box from a raster layer footprint (GeoJSON) and populate the result into a target `.gpkg` file.

# Usage
The service listens to a queue, once a message is recevied the work then immediately start.
###  For local development
Clone the repository, hit `npm install` & `npm start`. Make sure you have your configurations set right. 
* **Make sure you are running GDAL >= 3.2.0**.
###  Docker
Build an image with the provided `Dockerfile`, then run it.

# Environment Variables
**Service Specific**
* TILES_DIR_PATH - the directory on the filesystem where tiles are located
* GEOHASH_PRECISION - the precision of the geohash.
* GPKG_NAME - the name of the database.
* GPKG_PATH - full path of the directory that holds the gpkg.
* GPKG_TABLE_NAME - the table name of the where tiles are stored.
* GPKG_RESAMPLING - resampling method for building overviews. 
* BATCH_SIZE - Number of records to insert to the `.gpkg` in one transaction.

**Telemetry**
* TELEMETRY_SERVICE_NAME
* TELEMETRY_HOST_NAME
* TELEMETRY_SERVICE_VERSION
* TELEMETRY_TRACING_ENABLED
* TELEMETRY_TRACING_URL
* TELEMETRY_METRICS_ENABLED
* TELEMETRY_METRICS_URL
* TELEMETRY_METRICS_INTERVAL

**Logging**
* LOG_LEVEL
* LOG_PRETTY_PRINT_ENABLED

**Server**
* SERVER_PORT
* REQUEST_PAYLOAD_LIMIT
* RESPONSE_COMPRESSION_ENABLED