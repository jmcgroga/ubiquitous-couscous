const fs = require('fs')
const path = require('path')
const uuid = require('uuid')
const lunr = require('lunr')

let docContainers = path.join('documents', 'document_containers.json')
let containerPath = path.join('documents', 'containers')
let contentPath = path.join('documents', 'content')

class DocumentHandler {
    constructor() {
        this.documentContainers = []
        this.documentNames = {}
        this.documentById = {}
        this.loadDocuments()
    }

    loadDocuments() {
        var jsonText = fs.readFileSync(docContainers)
        this.documentContainers = JSON.parse(jsonText)
        this.processDocuments()
    }

    saveDocuments() {
        var jsonText = JSON.stringify(this.documentContainers)
        fs.writeFileSync(docContainers, jsonText)
    }

    processDocuments() {
        for (let i = 0; i < this.documentContainers.length; i++) {
            let container = this.documentContainers[i]
            this.documentNames[container.title.toLowerCase()] = container
            this.documentById[container.id] = container
        }
        this.documentContainers.sort(function (a, b) { return a.order - b.order })
    }

    newDocument(title) {
        var lcTitle = title.toLowerCase()
        var docObj = this.documentNames[lcTitle]
        if (!docObj) {
            docObj = {
                id: uuid.v4(),
                hidden: false,
                title: title,
                order: this.documentContainers.length
            }
            this.documentContainers.push(docObj)
            var found = false
            for (let i = 1; i < this.documentContainers.length; i++) {
                var currentObj = this.documentContainers[i]
                var currentTitle = currentObj.title.toLowerCase()

                if (currentTitle < lcTitle) {
                    currentObj.order = i
                } else if (currentTitle > lcTitle) {
                    currentObj.order = i + 1
                    if (!found) {
                        docObj.order = i
                        found = true
                    }
                }
            }
            this.processDocuments()
        }
        return docObj
    }
}

class Document {
    constructor(id, loadIds) {
        this.id = id
        this.contentIds = []
        loadIds = (typeof loadIds !== undefined) ? loadIds : true;
        if (loadIds) {
            this.loadContentIds()
        }
    }

    loadContentIds() {
        let containerFileName = path.join(containerPath, this.id)

        if (fs.existsSync(containerFileName)) {
            var jsonText = fs.readFileSync(containerFileName)
            var contentsObj = JSON.parse(jsonText)
            this.contentIds = contentsObj.contents
            this.uniqueContentIds()
        }
    }

    remove(id) {
        var index = this.contentIds.indexOf(id);

        if (index >= 0) {
            this.contentIds.splice( index, 1 );
            return this.save();
        }

        return Promise.resolve();
    }

    move(id, toDoc) {
        var index = this.contentIds.indexOf(id);

        return this.remove(id)
            .then(function() {
                toDoc.contentIds.push(id);
                return toDoc.save();
            });
    }

    update(id, command, contents) {
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

    add(id, command, contents) {
        if (this.contentIds.indexOf(id) < 0) {
            this.contentIds.push(id)
        }
        return this.update(id, command, contents)
    }

    uniqueContentIds() {
        var ids = {};
        this.contentIds = this.contentIds.filter(x => {
            if (ids[x]) {
                return false
            } else {
                ids[x] = 1;
            }
            return true
        })
    }

    save() {
        return new Promise(function(resolve, reject) {
            var containerFile = path.join(containerPath, this.id)
            this.uniqueContentIds()
            var jsonText = JSON.stringify({ contents: this.contentIds })
            fs.writeFile(containerFile,
                         jsonText,
                         function(err) {
                             if (err) {
                                 reject(err)
                             } else {
                                 resolve()
                             }
                         }.bind(this));
        }.bind(this));
    }

    load() {
        var items = []

        try {
            this.loadContentIds()

            for (var i = 0; i < this.contentIds.length; i++) {
                items.push(JSON.parse(fs.readFileSync(path.join(contentPath, this.contentIds[i])).toString()))
            }
        } catch (e) {
        }

        return items
    }
}

module.exports.DocumentHandler = DocumentHandler
module.exports.Document = Document
