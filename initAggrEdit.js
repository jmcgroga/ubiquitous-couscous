var aggrEdit;

function initAggrEdit() {
    aggrEdit = new AggrEdit();
    aggrEdit.loadPlugin("./default_commands.js")
        .then(function() {
            aggrEdit.registerCommand('help', function(editor, commandObj) {
                $j('#instructions').show();
            });
            aggrEdit.registerCommand('hidehelp', function(editor, commandObj) {
                $j('#instructions').hide();
            });
            aggrEdit.registerCommand('new', function(editor, commandObj) {
                var document = commandObj.parameters.trim();
                aggrEdit.document = document;
                aggrEdit.load();
            });
            aggrEdit.createQuill('text').then(() => {
                aggrEdit.load();
            });
        });
    aggrEdit.updateDocumentList();
    setInterval(function() {
        aggrEdit.save();
    }, 30000);
}

initAggrEdit();
