function initPlugin(aggrEdit) {
    aggrEdit.registerCreateEditorCommand('text');
    aggrEdit.registerCreateEditorCommand('requirements',
                                         null,
                                         function(quill, contents, commandObj) {
                                             quill.formatLine(0, 1, 'list', 'bullet');
                                         },
                                         true);
    registerLanguage(aggrEdit, 'python', '#');
    registerLanguage(aggrEdit, 'javascript', '/*', '*/');
    registerLanguage(aggrEdit, 'c++', '/*', '*/');
    registerLanguage(aggrEdit, 'html', '<!-- ', ' -->');
    registerLanguage(aggrEdit, 'xml', '<!-- ', ' -->');
}
