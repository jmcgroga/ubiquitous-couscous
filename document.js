const fs = require('fs')
const path = require('path')

let docPath = path.join('documents', 'documents')
let contentPath = path.join('documents', 'content')

class Document {
    constructor(name) {
        this.name = name
        this.docids = []
    }

    add(id, command, contents) {
        this.docids.push(id)

        if (!fs.existsSync(contentPath)) {
            fs.mkdirSync(contentPath)
        }

        return new Promise(function(resolve, reject) {
            fs.writeFile(path.join(contentPath, id),
                         JSON.stringify({
                             id: id,
                             command: command,
                             contents: contents
                         }), function (err) {
                             if (err){
                                 reject(err)
                             } else {
                                 resolve()
                             }
                         });
        }.bind(this));
    }

    save() {
        return new Promise(function(resolve, reject) {
            if (!fs.existsSync(docPath)) {
                fs.mkdirSync(docPath)
            }

            fs.writeFile(path.join(docPath, this.name),
                         this.docids.join('\n'), function(err) {
                             if (err) {
                                 reject(err)
                             } else {
                                 resolve()
                             }
                         }.bind(this));
        }.bind(this));
    }

    load() {
        var docidsText = fs.readFileSync(path.join(docPath, this.name)).toString()
        var items = []
        this.docids = docidsText.split(/\n/)

        for (var i = 0; i < this.docids.length; i++) {
            items.push(JSON.parse(fs.readFileSync(path.join(contentPath, this.docids[i])).toString()))
        }
        return items
    }
}

module.exports.Document = Document
