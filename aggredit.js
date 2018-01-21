function isElectron() {
    return process && process.versions && (process.versions['electron'] !== undefined);
}

var electronDocument = isElectron() ? require('./document') : null;
var uuidv4 = isElectron() ? require('uuid/v4') : null;

class AggrEdit {
    constructor() {
        this.commands = [
            'save',
            'load'
        ];

        this.commandRegExp = RegExp(/([^\s]+)\s?(.*)/);

        this.documentsAPI = "/aggredit/api/documents";
        this.uuidsAPI = "/aggredit/api/uuids";

        this.commandFunctions = {
        };

        this.createEditorCommands = {
        };

        this.removeAll();

        this.document = $j('#document').val();

        this.configureCommandElement();

        this.editorIds = null;

    }

    loadPlugin(jsFile) {
        return new Promise((resolve, reject) => {
            $j.getScript(jsFile)
                .done(function(script, textStatus) {
                    initPlugin(this);
                    resolve();
                }.bind(this))
                .fail(function( jqxhr, settings, exception ) {
                    reject(exception);
                });
        });
    }

    parseCommand(str) {
        var parsed = this.commandRegExp.exec(str),
            command = '',
            parameters = '';

        if (parsed !== null) {
            command = parsed[1];
            if (parsed[2]) {
                parameters = parsed[2];
            }
        }

        return { command: command,
                 parameters: parameters };
    }

    processCommand(str) {
        var commandObj = this.parseCommand(str),
            command = commandObj.command;

        commandObj.isCommand = (command != '') && ($j.inArray(command, this.commands) >= 0);
        commandObj.isCreateCommand = (command != '') && (this.createEditorCommands[command] !== undefined);

        return commandObj;
    }

    configureCommandElement() {
        $j('#command').keypress(function(e) {
            if (e.which == 13) {
                var commandStr = $j('#command').val(),
                    commandObj = this.processCommand(commandStr),
                    command = commandObj.command;

                if (commandObj.isCommand) {
                    $j('#command').val('');
                    $j('#footer').hide();
                    switch (command) {
                    case 'save':
                        this.save();
                        break;
                    case 'load':
                        this.load();
                        break;
                    default:
                        if (commandObj.isCreateCommand) {
                            this.createQuill(command, commandObj);
                        } else {
                            this.commandFunctions[command](this, commandObj);
                        }
                    }
                } else {
                    $j('#command').val('Invalid command: ' + commandStr);
                }
                
                if (this.focused) {
                  this.quillsByName[this.focused].focus();
                }
                return false;
            }
        }.bind(this));

        $j(document).on('keyup', function(e) {
            if (e.altKey && (e.which == 88)) {
                $j('#footer').show();
                $j('#command').val('');
                this.focused = $j(':focus').parent().attr('id');
                $j('#command').focus();
                e.stopPropagation();
            }
        }.bind(this));
    }

    removeAll() {
        $j('.ql-container').remove();
        this.quills = [];
        this.quillsByName = {};
        this.currentQuill = null;
        this.focused = null;
    }

    load() {
        if (electronDocument) {
            var electronDoc = new electronDocument.Document(this.document);
            $j.each(electronDoc.load(), function(i, val) {
                var config = this.getEditorCommandConfig(val.command);
                this._addQuill(val.id, config, val.contents);
            }.bind(this));
        } else {
            $j.getJSON(this.documentsAPI + "/" + this.document, function(data) {
                if (!$j.isEmptyObject(data)) {
                    this.removeAll();
                    $j.each(data.items, function(i, val) {
                        var config = this.getEditorCommandConfig(val.command);
                        this._addQuill(val.id, config, val.contents);
                    }.bind(this));
                }
            }.bind(this));
        }
    }

    save() {
        var saveObj = {
            document: this.document,
            items: []
        };
        if (electronDocument) {
            var electronDoc = new electronDocument.Document(this.document);
            var promises = [];
            $j.each(this.quills, function(i, val) {
                promises.push(electronDoc.add(val.id,
                                              val.command,
                                              val.quill.getContents().ops));
            }.bind(this));
            Promise.all(promises)
                .then(function() {
                    return electronDoc.save();
                })
                .then(function() {
                    alert("The file has been succesfully saved");
                })
                .catch(function(err) {
                    alert("An error ocurred updating the file" + err.message);
                    console.log(err);
                });
        } else {
            $j.each(this.quills, function(i, val) {
                saveObj.items.push({
                    id: val.id,
                    command: val.command,
                    contents: val.quill.getContents().ops
                });
            });

            $j.ajax({
                type: 'POST',
                url: this.documentsAPI,
                data: JSON.stringify(saveObj),
                contentType: 'application/json; charset=utf-8',
                dataType: "json"
            });
        }
    }

    registerCommand(command, fcn) {
        this.commands.push(command);
        this.commandFunctions[command] = fcn;
    }

    registerCreateEditorCommand(command, preCreate, postCreate, syntax) {
        this.createEditorCommands[command] = {
            command: command,
            syntax: syntax,
            preCreate: preCreate,
            postCreate: postCreate
        };

        this.commands.push(command);
    }

    getEditorCommandConfig(command) {
        return this.createEditorCommands[command];
    }

    createQuill(command, commandObj) {
        return new Promise((resolve, reject) => {
            var config = this.getEditorCommandConfig(command);

            if (isElectron()) {
                var editorId = uuidv4();
                this._addQuill(editorId, config, null, commandObj);
                resolve();
            } else if (this.editorIds && (this.editorIds.length > 0)) {
                var editorId = this.editorIds.pop();
                this._addQuill(editorId, config, null, commandObj);
                resolve();
            } else {
                $j.getJSON(this.uuidsAPI, function(data) {
                    this.editorIds = data['uuids'];
                    var editorId = this.editorIds.pop();
                    this._addQuill(editorId, config, null, commandObj);
                    resolve();
                }.bind(this))
                    .fail(function() {
                        var i,
                            first = 0;
                        if (this.lastId === undefined) {
                            this.editorIds = [];
                            this.lastId = 100;
                        } else {
                            first = this.lastId;
                            this.lastId += 100;
                        }
                        for (i = first; i < this.lastId; i++) {
                            this.editorIds.push(i);
                        }

                        this.editorIds.reverse();
                        
                        var editorId = this.editorIds.pop();
                        this._addQuill(editorId, config, null, commandObj);
                        resolve();
                    }.bind(this));
            }
        });
    }

    _addQuill(editorId, config, contents, commandObj) {
        var editorContainer,
            editorControl,
            nextEditorId,
            handle,
            even,
            quill,
            syntax;

        if ((config === undefined) || (config == null) ||
            (editorId === undefined) || (editorId == null)) {
            return;
        }

        even = this.quills.length % 2 == 0;
        syntax = (config.syntax === undefined) ? false : config.syntax;

        // Create the editor container
        nextEditorId = 'editor_' + editorId,

        editorContainer = $j(document.createElement('div'));
        editorContainer.attr({
            id: nextEditorId
        });

        $j('#editor').append(editorContainer);

        // Execute preCreate
        if (config.preCreate) {
            config.preCreate(commandObj);
        }

        // Create the Quill object in editorContainer
        quill = new Quill(editorContainer[0], {
            placeholder: 'Your Text Here',
            modules: {
                syntax: syntax,
                toolbar: false
//                toolbar: syntax ? [['code-block']] : false
            },
            theme: 'snow'
        });

        // Set the contents of the Quill object
        if (contents) {
            quill.setContents(contents);
        }

        // Execute postCreate
        if (config.postCreate) {
            config.postCreate(quill, contents, commandObj);
        }

        // Get the Quill editor and set the border
        editorControl = editorContainer.find('.ql-editor');
        editorControl.addClass(even ? 'even-left-border' : 'odd-left-border');

        // Create a "handle" for drag/drop
        handle = $j(document.createElement('div'));
        handle.attr({ id: 'handle_' + editorId,
                      'class': 'handle'
                    });
        handle.addClass(even ? 'even-handle' : 'odd-handle');

        editorContainer.append(handle);

        // Set the Quill editor to draggable, but do not make it draggable until the handle is entered
        editorContainer.draggable({
            containment: $j('#editor'), //'document',
            revert: true,
            disabled: true
        });

        // Enable dragging for the Quill editor
        handle.mouseenter(function() {
            editorContainer.draggable( "option", "disabled", false );
        });

        // Disable dragging for the Quill editor
        handle.mouseout(function() {
            editorContainer.draggable( "option", "disabled", true );
        });
        
        // Disable ALT-x keybinding in Quill editor (allow ALT-x to open command window)
        quill.keyboard.addBinding({
            key: 'x',
            altKey: true
        }, function (range, context) {
        });

        // Store the Quill object
        this.quills.push({ quill: quill,
                           id: editorId,
                           command: config.command
                         });
        this.quillsByName[nextEditorId] = quill;
        this.currentQuill = quill;

        // Focus the Quill editor
        this.focused = null; // focus will happen automatically
        quill.focus();

        // Scroll after the Quill editor is added
        $j('html, body').animate({scrollTop:$j(document).height()}, 'slow');
    }
}

function commentString(str, startComment, endComment) {
    return (startComment ? startComment : '') + str + (endComment ? endComment : '')
}

function postCreateSyntaxEditor(quill, contents, language, startComment, endComment) {
    if (!contents) {
        quill.setText(commentString('Your ' + language + ' Code Here', startComment, endComment));
    }
    quill.formatLine(0, 1, 'code-block', true);
    $j(quill.container).find('.ql-syntax').each(function(index) {
        $j(this).removeClass('ql-syntax').addClass(language);
    });
    quill.once('editor-change', function(eventName, ...args) {
        quill.setSelection(0, 100);
    });
}

function registerLanguage(aggrEdit, language, startComment, endComment) {
    aggrEdit.registerCreateEditorCommand(language,
                                         null,
                                         function(quill, contents) {
                                             postCreateSyntaxEditor(quill, contents, language, startComment, endComment);
                                         },
                                         true);
}
