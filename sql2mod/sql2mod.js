module.exports = function (RED) {
    "use strict";
    var reconnect = RED.settings.mysqlReconnectTime || 30000;
    var mysqldb = require('mysql');
    var mssqldb = require('mssql');
    var dialect44;
    var dialect55;
    
    function SQLNode2(n) {
        RED.nodes.createNode(this,n);
        
        console.log("PRIM1 - n.dialect = " + n.dialect);
        console.log("PRIM1 - n.typeserv1 = " + n.typeserv1);
        dialect44 = n.dialect;
        dialect55 = n.typeserv1;
        console.log("PRIM1 - dialect44 = " + dialect44);
        console.log("PRIM1 - dialect55 = " + dialect55);
        this.dialect = n.dialect;
        this.host = n.host;
        this.port = n.port;
        this.tz = n.tz || "local";
        this.typeserv1 = n.typeserv1;
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
            
            var config1 = {
                user: node.credentials.user,
                password: node.credentials.password,
                server: node.host, // You can use 'localhost\\instance' to connect to named instance 
                database: node.dbname,
                options: {
                    encrypt: true // Use this if you're on Windows Azure 
                }
            };
            
            

            
            console.log("sql2mod - start inspect dialect.. = " + node.dialect + " - ABBA");
            
            //var str = node.typeserv1.options[node.typeserv1.selectedIndex].text;
            console.log("sql2mod - start inspect typeserv1.. = " + n.typeserv1 + " - ABBA");
            if (node.dialect === 'mysql') {
                console.log("sql2mod - if flow 1 = " + node.dialect + " - ABBA5");
                //node.connection = mysqldb.createConnection(config);
                node.connection = mysqldb.createConnection({
                    host : node.host,
                    port : node.port,
                    user : node.credentials.user,
                    password : node.credentials.password,
                    database : node.dbname,
                    timezone : node.tz,
                    insecureAuth: true
                });
                
            } else if (node.dialect === 'mssql'){
                console.log("sql2mod - if flow 2 = " + node.dialect + " - ABBA5");
                node.connection = new mssqldb.Connection(config1);
                
            } else {
                console.log("sql2mod - if flow 3 = " + node.dialect + " - ABBA5");
                
            }

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
                console.log("sql2mod - dialect44.. = " + dialect44 + " - DEWT");
                if (typeof msg.topic === 'string') {
                    
                    if (dialect55 === "mysql") {
                      console.log("sql2mod - Loop(mysql) dialect55.. = " + dialect55);
                    } else if (dialect55 === "mssql") {
                        console.log("sql2mod - Loop(mysql) dialect55.. = " + dialect55);
                    } else {
                        console.log("sql2mod - Loop(else) dialect55.. = " + dialect55);
                    }
                    
                    if (dialect44 === "mysql") {
                        console.log("sql2mod - Loop(mysql) dialect44.. = " + dialect44);
                        var bind = Array.isArray(msg.payload) ? msg.payload : [];
                        node.mydbConfig.connection.query(msg.topic, bind, function(err, rows) {
                            if (err) { node.error(err,msg); }
                            else {
                                msg.payload = rows;
                                node.send(msg);
                            }
                        });

                    } else if (dialect44 === "mssql") {
                        console.log("sql2mod - Loop(mssql) dialect44.. = " + dialect44);
                        var bind = Array.isArray(msg.payload) ? msg.payload : [];
                        node.mydbConfig.connection.connect(function(err) {
                            var request = node.mydbConfig.connection.request(); // or: var request = connection.request(); 
                            request.query(msg.topic, function(err, recordset) {
				if (err) { node.warn(err); }
				else {
                                    msg.payload = recordset;
                                    node.send(msg);
				}
				//console.dir(recordset);							
                            });																		
			});
                        
                    } else {
                        console.log("sql2mod - Loop(else) dialect44.. = " + dialect44);
                    }
                    
                    //console.log("query:",msg.topic);
                    
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
    
    RED.nodes.registerType("sql2mod", Sql2ModNode);
    
};