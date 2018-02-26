function daysToMilliseconds(days) {
    return days * 24 * 60 * 60 * 1000;
}

function sampleGantt() {
    return "Task ID		Task Name					Start Date	End Date		Duration	Percent Complete	Dependencies\n" +
        "Research		Find sources				1/1/2018		1/5/2018		null			100							null\n" +
        "Write			Write paper					1/6/2018		null				3				25							Research,Outline\n" +
        "Cite				Create bibliography		1/6/2018		null				1				20							Research\n" +
        "Complete		Hand in paper				1/9/2018	null				1				0								Cite,Write\n" +
        "Outline			Outline paper				1/5/2018		null				1				100							Research\n";
}

function ganttTextToRows(text) {
    var textRows = text.split('\n'),
        rows = [],
        splitRow,
        trimString

    for (var i = 1; i < textRows.length; i++) {
        trimString = textRows[i].trim()
        if (trimString.length == 0) {
            continue;
        }
        splitRow = trimString.split(/\t+/)
        splitRow[2] = (splitRow[2] == 'null') ? null : new Date(Date.parse(splitRow[2]))
        splitRow[3] = (splitRow[3] == 'null') ? null : new Date(Date.parse(splitRow[3]))
        splitRow[4] = (splitRow[4] == 'null') ? null : daysToMilliseconds(parseInt(splitRow[4]))
        splitRow[5] = (splitRow[5] == 'null') ? 0 : parseInt(splitRow[5])
        splitRow[6] = (splitRow[6] == 'null') ? null : splitRow[6]
        rows.push(splitRow)
    }
    return rows
}

function initPlugin(aggrEdit) {
    google.charts.load('current', {'packages':['gantt']});
    aggrEdit.registerCreateEditorCommand('text');
    aggrEdit.registerCreateEditorCommand('requirements',
                                         null,
                                         function(quill, contents, commandObj) {
                                             quill.formatLine(0, 1, 'list', 'bullet');
                                         },
                                         true);
    aggrEdit.registerCreateEditorCommand('gantt',
                                         null,
                                         function(quill, contents, commandObj) {
                                             var displayRegion = aggrEdit.createDisplayRegion(quill.container.id);
                                             displayRegion.html('Nothing to display');

                                             if (quill.getLength() < 40) {
                                                 quill.setText(sampleGantt())
                                             }

                                             try {
                                                 var data = new google.visualization.DataTable();
                                                 data.addColumn('string', 'Task ID');
                                                 data.addColumn('string', 'Task Name');
                                                 data.addColumn('date', 'Start Date');
                                                 data.addColumn('date', 'End Date');
                                                 data.addColumn('number', 'Duration');
                                                 data.addColumn('number', 'Percent Complete');
                                                 data.addColumn('string', 'Dependencies');

                                                 var rows = ganttTextToRows(quill.getText())
                                                 console.log(rows)
                                                 data.addRows(rows)

                                                 var options = {
                                                     height: 275
                                                 };

                                                 var chart = new google.visualization.Gantt(displayRegion.get(0));

                                                 chart.draw(data, options);
                                             } catch (e) {
                                                 displayRegion.html('Unable to render Gantt chart: ' + e)
                                             }
                                         },
                                         true);
    registerLanguage(aggrEdit, 'python', '#');
    registerLanguage(aggrEdit, 'javascript', '/*', '*/');
    registerLanguage(aggrEdit, 'c++', '/*', '*/');
    registerLanguage(aggrEdit, 'html', '<!-- ', ' -->');
    registerLanguage(aggrEdit, 'xml', '<!-- ', ' -->');
}
