const assert = require('chai').assert
const uuid = require('uuid')
const document = require('../document.js')

function generateTestContent() {
    return {
        id : uuid.v4(),
        command : "text",
        contents : [{insert : "\n"}]
    }
}

function isSorted(arr, keyFunc, cmpFunc, startIndex) {
    startIndex = startIndex ? startIndex : 1
    cmpFunc = cmpFunc ? cmpFunc : (a, b) => { return a <= b }

    for (var i = startIndex; i < arr.length; i++) {
        var lhs = arr[i - 1]
        var rhs = arr[i]

        if (keyFunc) {
            lhs = keyFunc(lhs)
            rhs = keyFunc(rhs)
        }
        assert(cmpFunc(lhs, rhs), 'isSorted: ' + lhs + ' <> ' + rhs)
    }
}

describe('AggrEdit', function() {
    let documentHandler = new document.DocumentHandler()
    let testContent = generateTestContent()
    var id = documentHandler.documentContainers[0].id
    var testDoc = new document.Document(id)
    testDoc.load()

    describe('DocumentHandler', function() {
        it('create', function() {
            assert(documentHandler)
        })
        it('add content', function() {
            return testDoc.add(testContent.id,
                               testContent.command,
                               testContent.contents)
                .then(function() {
                    assert.include(testDoc.contentIds, testContent.id)
                })
        })
        it('save document', function() {
            let beforeContentIds = testDoc.contentIds
            assert.notEqual(beforeContentIds.length, 0)
            return testDoc.save().then(function() {
                var doc = new document.Document(id)
                assert.deepEqual(beforeContentIds, doc.contentIds)
                return Promise.resolve()
            })
        })
        it('update content', function() {
            testContent.contents[0].insert = "This is new content\n"
            return testDoc.add(testContent.id,
                               testContent.command,
                               testContent.contents)
        })
        it('load document', function() {
            var id = documentHandler.documentContainers[0].id
            var doc = new document.Document(id)
            var contents = doc.load()
            let lastContents = contents[contents.length - 1]
            assert.include(doc.contentIds, testContent.id)
            assert.deepEqual(testContent, lastContents)
        })
        it('move content', function() {
            let sourceId = documentHandler.documentContainers[0].id
            let destId = documentHandler.documentContainers[1].id
            let sourceDoc = new document.Document(sourceId)
            let destDoc = new document.Document(destId)
            sourceDoc.load()
            destDoc.load()

            let idToMove = sourceDoc.contentIds[0]

            return sourceDoc.move(idToMove, destDoc)
                .then(function() {
                    let checkSourceDoc = new document.Document(sourceId)
                    let checkDestDoc = new document.Document(destId)
                    checkSourceDoc.load()
                    checkDestDoc.load()
                    assert.include(checkDestDoc.contentIds, idToMove)
                    assert.notInclude(checkSourceDoc.contentIds, idToMove)
                    return checkDestDoc.move(idToMove, checkSourceDoc)
                })
        })
        it('new document', function() {
            var newContent = generateTestContent()
            let currentNumDocs = documentHandler.documentContainers.length
            var newDocument = documentHandler.newDocument('Test Document')
            newDocument = documentHandler.newDocument('Ab')
            newDocument = documentHandler.newDocument('ZZ')
            newDocument = documentHandler.newDocument('ZZ')

            isSorted(documentHandler.documentContainers,
                     (a) => {
                         return a.title.toLowerCase()
                     },
                     (a, b) => {
                         return a <= b
                     },
                     2)
            documentHandler.saveDocuments()
            return new document.Document(newDocument.id).add(newContent.id,
                                                             newContent.command,
                                                             newContent.contents)

        })
    })
})
