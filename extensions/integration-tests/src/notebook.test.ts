/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import 'mocha';
import assert = require('assert');

import * as azdata from 'azdata';
import * as vscode from 'vscode';
import { context } from './testContext';
import { sqlNotebookContent, writeNotebookToFile, sqlKernelMetadata } from './notebook.util';
import { getBdcServer } from './testConfig';
import { connectToServer } from './utils';
import * as fs from 'fs';

if (context.RunTest) {
	suite('Notebook integration test suite', function() {
		test('Sql NB test', async function () {
			let testName = this.test.title;
			console.log(`Start "${testName}"`);
			let notebook = await openNotebook(sqlNotebookContent, sqlKernelMetadata);
			const expectedOutput0 = '(1 row affected)';
			let cellOutputs = notebook.document.cells[0].contents.outputs;
			console.log('Got cell outputs');
			assert(cellOutputs.length === 3, `Expected length: 3, Actual: ${cellOutputs.length}`);
			let actualOutput0 = (<azdata.nb.IDisplayData>cellOutputs[0]).data['text/html'];
			console.log('Got first output');
			assert(actualOutput0 === expectedOutput0, `Expected row count: ${expectedOutput0}, Actual: ${actualOutput0}`);
			let actualOutput2 = (<azdata.nb.IExecuteResult>cellOutputs[2]).data['application/vnd.dataresource+json'].data[0];
			assert(actualOutput2[0] === '1', `Expected result: 1, Actual: '${actualOutput2[0]}'`);

			if (fs.existsSync(notebook.document.fileName)) {
				fs.unlinkSync(notebook.document.fileName);
			}
			console.log(`"${testName}" done`);
		});

		// test('Python3 notebook test', async function () {
		// 	console.log('Start Python3 NB test');
		// 	let notebook = await openNotebook(pySparkNotebookContent, pythonKernelMetadata);
		// 	let cellOutputs = notebook.document.cells[0].contents.outputs;
		// 	console.log('Got cell outputs');
		// 	let result = (<azdata.nb.IExecuteResult>cellOutputs[0]).data['text/plain'];
		// 	assert(result === '2', `Expected: 2, Actual: ${result}`);
		// 	console.log('Python3 NB done');
		// });

		// test('Clear all outputs - Python3 notebook ', async function () {
		// 	let notebook = await openNotebook(pySparkNotebookContent, pythonKernelMetadata);
		// 	//Check if at least one cell with output
		// 	let cellWithOutputs = notebook.document.cells.find(cell => cell.contents && cell.contents.outputs && cell.contents.outputs.length > 0);
		// 	console.log("Before clearing cell outputs");
		// 	if (cellWithOutputs) {
		// 		let clearedOutputs = await notebook.clearAllOutputs();
		// 		let cells = notebook.document.cells;
		// 		cells.forEach(cell => {
		// 			assert(cell.contents && cell.contents.outputs && cell.contents.outputs.length === 0, `Expected Output: 0, Actual: '${cell.contents.outputs.length}'`);
		// 		});
		// 		assert(clearedOutputs, 'Outputs of all the code cells from Python notebook should be cleared');
		// 		console.log("After clearing cell outputs");
		// 	}
		// 	assert(cellWithOutputs === undefined, 'Could not find notebook cells with outputs');
		// });

		test('Clear all outputs - SQL notebook ', async function () {
			let notebook = await openNotebook(sqlNotebookContent, sqlKernelMetadata);
			let cellWithOutputs = notebook.document.cells.find(cell => cell.contents && cell.contents.outputs && cell.contents.outputs.length > 0);
			console.log('Before clearing cell outputs');
			if (cellWithOutputs) {
				let clearedOutputs = await notebook.clearAllOutputs();
				let cells = notebook.document.cells;
				cells.forEach(cell => {
					assert(cell.contents && cell.contents.outputs && cell.contents.outputs.length === 0, `Expected cell outputs to be empty. Actual: '${cell.contents.outputs}'`);
				});
				assert(clearedOutputs, 'Outputs of all the code cells from SQL notebook should be cleared');
				console.log('After clearing cell outputs');
			}
			else {
				throw new Error('Could not find notebook cells with outputs');
			}
		});


		// test('PySpark3 notebook test', async function () {
		// 	this.timeout(12000);
		// 	let notebook = await openNotebook(pySparkNotebookContent, pySpark3KernelMetadata);
		// 	let cellOutputs = notebook.document.cells[0].contents.outputs;
		// 	let sparkResult = (<azdata.nb.IStreamResult>cellOutputs[3]).text;
		// 	assert(sparkResult === '2', `Expected: 2, Actual: ${sparkResult}`);
		// });
	});
}
async function openNotebook(content: azdata.nb.INotebookContents, kernelMetadata: any): Promise<azdata.nb.NotebookEditor> {
	let notebookConfig = vscode.workspace.getConfiguration('notebook');
	notebookConfig.update('pythonPath', process.env.PYTHON_TEST_PATH, 1);
	let server = await getBdcServer();
	await connectToServer(server, 6000);
	let pythonNotebook = Object.assign({}, content, { metadata: kernelMetadata });
	let uri = writeNotebookToFile(pythonNotebook);
	console.log(uri);
	let notebook = await azdata.nb.showNotebookDocument(uri);
	console.log('Notebook is opened');
	assert(notebook.document.cells.length === 1, 'Notebook should have 1 cell');
	console.log('Before run notebook cell');
	let ran = await notebook.runCell(notebook.document.cells[0]);
	console.log('After run notebook cell');
	assert(ran, 'Notebook runCell should succeed');
	assert(notebook !== undefined && notebook !== null, 'Expected notebook object is defined');
	return notebook;
}

