const fs = require("fs");

class Logger {
    constructor(moduleName) {
        this.moduleName = moduleName;
    }

    log(level, message){
        const line = `[${new Date().toISOString()}] [${level}] [${this.moduleName}] ${message}\n`
        process.stdout.write(line);

        fs.appendFile("app.log", line, err => {
            if (err) {
                console.log(err);
            }
        })
    }

    info(message){
        this.log("INFO", message);
    }
    warn(message){
        this.log("WARN", message);
    }
    error(message){
        this.log("ERROR", message);
    }
}

module.exports = Logger;