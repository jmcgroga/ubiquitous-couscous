const fs = require('fs')
const path = require('path')

let docPath = path.join('documents', 'documents')
let contentPath = path.join('documents', 'content')

function documentList() {
    return fs.readdirSync(docPath).sort((lhs,rhs) => {
        var l = lhs.toUpperCase(),
            r = rhs.toUpperCase();

        if ((l == 'HOME') || (r == 'HOME')) {
            if (l == r) {
                return 0;
            }
            if (l == 'HOME') {
                return -1;
            }
            return 1;
        }

        if (l < r) {
            return -1;
        }

        if (l > r) {
            return 1;
        }

        return 0;
    });
}

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
        var docidsText;
        var items = []

        try {
            docidsText = fs.readFileSync(path.join(docPath, this.name)).toString()
            this.docids = docidsText.split(/\n/)

            for (var i = 0; i < this.docids.length; i++) {
                items.push(JSON.parse(fs.readFileSync(path.join(contentPath, this.docids[i])).toString()))
            }
        } catch (e) {
        }

        return items
    }
}

module.exports.Document = Document
module.exports.documentList = documentList
