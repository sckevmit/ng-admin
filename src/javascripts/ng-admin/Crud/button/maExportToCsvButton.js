export default function maExportToCsvButton ($stateParams, Papa, notification, AdminDescription, entryFormatter, ReadQueries) {
    return {
        restrict: 'E',
        scope: {
            entity: '&',
            label: '@',
            datastore: '&'
        },
        link: function(scope) {
            scope.label = scope.label || 'EXPORT';
            scope.datastore = scope.datastore();
            scope.entity = scope.entity();
            var exportView = scope.entity.exportView();
            var listView = scope.entity.listView();
            if (exportView.fields().length === 0) {
                var exportFields = listView.exportFields();
                if (exportFields === null) {
                    exportFields = listView.fields();
                }
                exportView.fields(exportFields);
                exportView.filters(listView.filters());
                exportView.name(listView.name()); // to enable reuse of sortField
            }
            scope.has_export = exportView.fields().length > 0;
            var formatEntry = entryFormatter.getFormatter(exportView.fields());

            scope.exportToCsv = function () {
                var rawEntries;

                ReadQueries.getAll(exportView, -1, $stateParams.search, $stateParams.sortField, $stateParams.sortDir)
                    .then(response => {
                        rawEntries = response.data;
                        return rawEntries;
                    })
                    .then(rawEntries => ReadQueries.getReferenceData(exportView.fields(), rawEntries))
                    .then(referenceData => {
                        const references = exportView.getReferences();
                        for (var name in referenceData) {
                            AdminDescription.getEntryConstructor().createArrayFromRest(
                                referenceData[name],
                                [references[name].targetField()],
                                references[name].targetEntity().name(),
                                references[name].targetEntity().identifier().name()
                            ).map(entry => scope.datastore.addEntry(references[name].targetEntity().uniqueId + '_values', entry));
                        }
                    })
                    .then(function () {
                        var entries = exportView.mapEntries(rawEntries);

                        // shortcut to diplay collection of entry with included referenced values
                        scope.datastore.fillReferencesValuesFromCollection(entries, exportView.getReferences(), true);

                        var results = [];
                        for (var i = entries.length - 1; i >= 0; i--) {
                            results[i] = formatEntry(entries[i]);
                        }
                        var csv = Papa.unparse(results, listView.exportOptions());
                        var fakeLink = document.createElement('a');
                        document.body.appendChild(fakeLink);

                        const blobName = `${scope.entity.name()}.csv`;

                        if (window.navigator && window.navigator.msSaveOrOpenBlob) { // Manage IE11+ & Edge
                            var blob = new Blob([csv], { type: 'text/csv' });
                            window.navigator.msSaveOrOpenBlob(blob, blobName);
                        } else {
                            fakeLink.setAttribute('href', 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(csv));
                            fakeLink.setAttribute('download', blobName);
                            fakeLink.click();
                        }
                    }, function (error) {
                        notification.log(error.message, {addnCls: 'humane-flatty-error'});
                    });
            };
        },
        template:
`<span ng-if="has_export">
    <a class="btn btn-default" ng-click="exportToCsv()">
        <span class="glyphicon glyphicon-download" aria-hidden="true"></span>&nbsp;<span class="hidden-xs" translate="{{ ::label }}"></span>
    </a>
</span>`
    };
}

maExportToCsvButton.$inject = ['$stateParams', 'Papa', 'notification', 'AdminDescription', 'EntryFormatter', 'ReadQueries'];
