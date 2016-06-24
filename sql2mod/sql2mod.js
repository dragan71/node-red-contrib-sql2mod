module.exports = function (RED) {
    "use strict";
    var reconnect = RED.settings.mysqlReconnectTime || 30000;
    var mysqldb = require('mysql');
    var mssqldb = require('mssql');
    
    
    function SQLNode2(n) {
        RED.nodes.createNode(this,n);
        this.host = n.host;
        this.port = n.port;
        this.tz = n.tz || "local";

        this.connected = false;
        this.connecting = false;

        this.dbname = n.db;
        var node = this;

        function doConnect() {
            node.connecting = true;
            
            var config = {
		user: node.credentials.user,
		password: node.credentials.password,
		server: node.host, // You can use 'localhost\\instance' to connect to named instance 
                host : node.host,
                port : node.port,
		database: node.dbname,				
		options: {
		    encrypt: true // Use this if you're on Windows Azure 
		}				
	    };
            
            if (node.dialect === 'mysql') {
                node.connection = mysqldb.createConnection(config);
            
            } else if (node.dialect === 'mssql'){
                node.connection = mssqldb.Connection(config);
                
            }
//            node.connection = mysqldb.createConnection({
//                host : node.host,
//                port : node.port,
//                user : node.credentials.user,
//                password : node.credentials.password,
//                database : node.dbname,
//                timezone : node.tz,
//                insecureAuth: true
//            });

            node.connection.connect(function(err) {
                node.connecting = false;
                if (err) {
                    node.error(err);
                    node.tick = setTimeout(doConnect, reconnect);
                } else {
                    node.connected = true;
                }
            });

            node.connection.on('error', function(err) {
                node.connected = false;
                if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                    doConnect(); // silently reconnect...
                } else {
                    node.error(err);
                    doConnect();
                }
            });
        }

        this.connect = function() {
            if (!this.connected && !this.connecting) {
                doConnect();
            }
        }

        this.on('close', function (done) {
            if (this.tick) { clearTimeout(this.tick); }
            if (this.connection) {
                node.connection.end(function(err) {
                    if (err) { node.error(err); }
                    done();
                });
            } else {
                done();
            }
        });
    }
    
    RED.nodes.registerType("SQLdatab",SQLNode2, {
        credentials: {
            user: {type: "text"},
            password: {type: "password"}
        }
    });
    
    function Sql2ModNode(n) {
        RED.nodes.createNode(this,n);
        this.mydb2 = n.mydb2;
        this.mydbConfig = RED.nodes.getNode(this.mydb2);

        if (this.mydbConfig) {
            this.mydbConfig.connect();
            var node = this;
            node.on("input", function(msg) {
                if (typeof msg.topic === 'string') {
                    //console.log("query:",msg.topic);
                    var bind = Array.isArray(msg.payload) ? msg.payload : [];
                    node.mydbConfig.connection.query(msg.topic, bind, function(err, rows) {
                        if (err) { node.error(err,msg); }
                        else {
                            msg.payload = rows;
                            node.send(msg);
                        }
                    });
                }
                else {
                    if (typeof msg.topic !== 'string') { node.error("msg.topic : the query is not defined as a string"); }
                }
            });
        }
        else {
            this.error("MySQL database not configured");
        }
    }
    //RED.nodes.registerType("mysql",MysqlDBNodeIn);
    RED.nodes.registerType("sql2mod", Sql2ModNode);
    
};