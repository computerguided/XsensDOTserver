// =======================================================================================
// BLE Handler
// Documentation: https://tinyurl.com/rwtej5x
// =======================================================================================

// =======================================================================================
// Packages
// =======================================================================================
var Quaternion = require('quaternion');

// =======================================================================================
// Constants
// =======================================================================================
const SENSOR_NAME          = "Xsens DOT",
      SENSOR_ENABLE        = 0x01,
      SENSOR_DISABLE       = 0x00,
      BLE_UUID_CONTROL     = "15172001494711e98646d663bd873d93",
      BLE_UUID_MEASUREMENT = "15172004494711e98646d663bd873d93",
      ROLLOVER             = 4294967295,
      CLOCK_DELTA          = 0.0002;

// =======================================================================================
// Class definition
// =======================================================================================

class BleHandler 
{
    constructor( bleEventsInterface )
    {
        this.bleEvents = bleEventsInterface;
        this.discoveredSensorCounter = 0;
        this.central = require('noble-mac');
        this.setBleEventHandlers(this);

        console.log( "BLE Handler started." );
    }

    // -----------------------------------------------------------------------------------
    // -- Set BLE Handlers --
    // -----------------------------------------------------------------------------------
    setBleEventHandlers()
    {
        var bleHandler = this,
            central    = this.central;

        central.on( 'stateChange', function(state)
        {
            if( state == 'poweredOn' )
            {
                bleHandler.sendBleEvent( 'blePoweredOn' );
            }
        });

        central.on( 'scanStart', function()
        {
            bleHandler.sendBleEvent( 'bleScanningStarted' );
        });

        central.on( 'scanStop', function()
        {
            bleHandler.sendBleEvent( 'bleScanningStopped' );
        });

        central.on( 'discover', function(peripheral)
        {
            var localName = peripheral.advertisement.localName;

            if( localName && localName == SENSOR_NAME )
            {
                if( peripheral.address == undefined || peripheral.address == "" )
                {
                    peripheral.address = (bleHandler.discoveredSensorCounter++).toString(16);
                }

                var sensor = peripheral;
                sensor.name = peripheral.advertisement.localName;
                sensor.characteristics = {};
                sensor.systemTimestamp = 0;
                sensor.sensorTimestamp = 0;

                bleHandler.sendBleEvent( 'bleSensorDiscovered', {sensor:sensor} );
            }
        });
    }

    // -----------------------------------------------------------------------------------
    // -- Start scanning --
    // -----------------------------------------------------------------------------------
    startScanning()
    {
        this.central.startScanning( [], true );
    }

    // -----------------------------------------------------------------------------------
    // -- Stop scanning --
    // -----------------------------------------------------------------------------------
    stopScanning()
    {
        this.central.stopScanning();
    }
    
    // -----------------------------------------------------------------------------------
    // -- Connect sensor --
    // -----------------------------------------------------------------------------------
    connectSensor( sensor )
    {
        var bleHandler = this;

        sensor.removeAllListeners();
        sensor.connect( function(error)
        {
            if( error )
            {
                bleHandler.sendBleEvent( 'bleSensorError', { sensor:sensor, error:error } );
                return;
            }
            sensor.discoverAllServicesAndCharacteristics( function(error, services, characteristics)
            {
                if( error )
                {
                    bleHandler.sendBleEvent( 'bleSensorError', { sensor:sensor, error: error } );
                    return;
                }
                sensor.characteristics = {};
                characteristics.forEach( function( characteristic )
                {
                    sensor.characteristics[characteristic.uuid] = characteristic;
                });

                sensor.on( 'disconnect', function()
                {
                    bleHandler.sendBleEvent( 'bleSensorDisconnected', { sensor:sensor } );
                });
                bleHandler.sendBleEvent( 'bleSensorConnected', { sensor:sensor } );
            });
        });
    }

    // -----------------------------------------------------------------------------------
    // -- Send BLE event --
    // -----------------------------------------------------------------------------------
    sendBleEvent( eventName, parameters )
    {
        var bleHandler = this;
        if( eventName == 'bleSensorError' )
        {
            setTimeout( function()
            {
                bleHandler.bleEvents.emit( 'bleEvent', eventName, parameters );
            },10);
            return;
        }
        bleHandler.bleEvents.emit( 'bleEvent', eventName, parameters );
    }

    // -----------------------------------------------------------------------------------
    // -- Enable sensor --
    // -----------------------------------------------------------------------------------
    enableSensor( sensor )
    {
        var bleHandler = this,
            controlCharacteristic     = sensor.characteristics[BLE_UUID_CONTROL],
            measurementCharacteristic = sensor.characteristics[BLE_UUID_MEASUREMENT];
        
        var buffer = new Buffer(3);
        buffer[0] = 0x01;
        buffer[1] = SENSOR_ENABLE;
        buffer[2] = 0x02;


        if( measurementCharacteristic.listenerCount('data') == 0 )
        {
            measurementCharacteristic.on('data', function(data)
            {
                bleHandler.sendBleEvent
                ( 
                    "bleSensorData", 
                    convertSensorData( sensor, data )
                );
            });
        }

        controlCharacteristic.write( buffer, false, function(error)
        {
            if( error )
            {
                bleHandler.sendBleEvent( 'bleSensorError', { sensor:sensor, error: error } );
                return;
            }

            measurementCharacteristic.subscribe( function(error)
            {
                if( error )
                {
                    bleHandler.sendBleEvent( 'bleSensorError', { sensor:sensor, error: error } );
                    return;
                }

                bleHandler.sendBleEvent(  'bleSensorEnabled', { sensor:sensor } );
            });
        });
    }

    // -----------------------------------------------------------------------------------
    // -- Disable sensor --
    // -----------------------------------------------------------------------------------
    disableSensor( sensor )
    {
        var bleHandler = this,
            controlCharacteristic     = sensor.characteristics[BLE_UUID_CONTROL],
            measurementCharacteristic = sensor.characteristics[BLE_UUID_MEASUREMENT];

        measurementCharacteristic.removeAllListeners();

        var buffer = new Buffer(3);
        buffer[0] = 0x01;
        buffer[1] = SENSOR_DISABLE;
        buffer[2] = 0x02;

        controlCharacteristic.write( buffer, false, function(error)
        {
            if( error )
            {
                bleHandler.sendBleEvent( 'bleSensorError', { sensor:sensor, error: error } );
                return;
            }

            bleHandler.sendBleEvent( 'bleSensorDisabled', { sensor:sensor } );
        });
    }

    // -----------------------------------------------------------------------------------
    // -- Disconnect sensor --
    // -----------------------------------------------------------------------------------
    disconnectSensor( sensor )
    {
        sensor.disconnect( function(error)
        {
            if( error )
            {
                bleHandler.sendBleEvent( 'bleSensorError', { sensor:sensor, error: error } );
                return;
            }
        });
    }
}

// =======================================================================================
// Local functions
// =======================================================================================

// ---------------------------------------------------------------------------------------
// -- Convert sensor data --
// ---------------------------------------------------------------------------------------
function convertSensorData( sensor, data )
{
    const hrTime = process.hrtime();
    var systemtime = hrTime[0] * 1000000 + hrTime[1] / 1000;

    setSynchronizedTimestamp( sensor, data, systemtime );

    var orientation = getOrientation(data);
    var result =     
    {
        timestamp: sensor.systemTimestamp,
        address:   sensor.address,
        q_w:       orientation.w,
        q_x:       orientation.x,
        q_y:       orientation.y,
        q_z:       orientation.z,
    };

    return result;
}

// ---------------------------------------------------------------------------------------
// -- Set synchronized timestamp --
// ---------------------------------------------------------------------------------------
function setSynchronizedTimestamp( sensor, data, systemtime )
{
    var sensorTimestamp = getSensorTimestamp( data );

    if( sensor.systemTimestamp == 0 )
    {
        sensor.systemTimestamp = systemtime;
        sensorTimestamp = sensorTimestamp;
        return;
    }

    var sensorTimeDiff = sensorTimestamp - sensor.sensorTimestamp;
    if( sensorTimeDiff < 0 )
    {
        sensorTimeDiff += ROLLOVER;
    }
    sensor.sensorTimestamp = sensorTimestamp;

    
    sensor.systemTimestamp = sensor.systemTimestamp + sensorTimeDiff*(1+CLOCK_DELTA);


    if( sensor.systemTimestamp > systemtime )
    {
        sensor.systemTimestamp = systemtime;
    }


}

// ---------------------------------------------------------------------------------------
// -- Get orientation --
// ---------------------------------------------------------------------------------------
function getOrientation(data)
{
    var w,x,y,z;
    
    w = data.readFloatLE(4);
    x = data.readFloatLE(8);
    y = data.readFloatLE(12);
    z = data.readFloatLE(16);

    return new Quaternion(w, x, y, z);
}

// ---------------------------------------------------------------------------------------
// -- Get sensor timestamp --
// ---------------------------------------------------------------------------------------
function getSensorTimestamp(data)
{
    return data.readUInt32LE(0);
}

// =======================================================================================
// Export the BleHandler class
// =======================================================================================
module.exports = BleHandler;

