#!/usr/bin/env node

'use strict';

var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;
var spawn = require('cross-spawn');
var os = require('os');
var randomstring = require("randomstring");

var projectName;
var actionType;
var nickelPackageName;
var tempDir;
var pathRoot;
var rmdir = require('rmdir');
var stdioStyle = 'ignore';

function log(text) {
	console.log(chalk.bgCyan('nickel') + "        " + text);
}

function skip() {
	console.log(chalk.bgCyan('nickel'));
}

function shouldUseYarn() {
	try {
		execSync('yarn --version', {stdio: 'ignore'});
		return true;
	} catch (e) {
		return false;
	}
}

function install(packageToInstall, verbose, callback) {

	process.chdir(tempDir);

	var command;
	var args;
	if (shouldUseYarn()) {
		command = 'yarn';
		args = [ 'add', '--dev', '--exact', packageToInstall];
	} else {
		command = 'npm';
		args = ['install', '--save-dev', '--save-exact', packageToInstall];
	}

	if (verbose) {
		args.push('--verbose');
	}

	var child = spawn(command, args, {stdio: stdioStyle});
	child.on('close', function(code) {
		callback(code, command, args);
	});
}

function nextStep(code) {
	log(chalk.green(nickelPackageName) + ' installed and initialized at ' + chalk.cyan(pathRoot));
	log('Removing temp installer:');
	rmdir(tempDir, function(err){
		log('Temp installer was successfully removed.');
		skip();
		skip();
		log('Everything is ready. You can find your project at ' + chalk.cyan(pathRoot));
		log('To start it just type: ' + chalk.blue.bold('npm run start') + '. Good luck!');
	});
}

function activateInstaller() {
	var packagePath = path.resolve(tempDir, 'node_modules', nickelPackageName);

	process.chdir(packagePath);

	fs.writeFileSync('package.json', fs.readFileSync('package.json', 'utf8').replace(/{#PROJECT_DIRECTORY#}/gi, pathRoot), 'utf8');

	var child = spawn('npm', ['run', 'init'], {stdio: stdioStyle});
	child.on('close', function(code) {
		nextStep(code);
	});
}

function fetchInstaller() {

	tempDir = path.resolve(os.tmpdir(), 'nickel-installer-' + randomstring.generate(10));

	fs.mkdirSync(tempDir);
	log('Created temp directory for installer: ' + chalk.green(tempDir));

	var installerPackageJson = {
		name: 'nickel-temp-installer',
		version: '0.0.1',
		private: true
	};

	fs.writeFileSync(
		path.join(tempDir, 'package.json'),
		JSON.stringify(installerPackageJson, null, 2)
	);

	var originalDirectory = process.cwd();

	log('Fetching the most recent installer...');
	install(nickelPackageName, program.verbose, activateInstaller);
}

var program = require('commander')
	.version(require('./package.json').version)
	.arguments('<type> [project-directory]')
	.usage(chalk.cyan('<type>') + ' ' + chalk.green('<project-directory>') + ' [options]')
	.action(function (type, name) {
		actionType = type;
		if (!name) {
			projectName = actionType;
		} else {
			projectName = name;
		}
		nickelPackageName = 'nickel-' + actionType;
	})
	.option('--verbose', 'print additional logs')
	.on('--help', function () {
		log(chalk.cyan('<type>') + ' ' + chalk.green('<project-directory>') + ' is required.');
	})
	.parse(process.argv);

if (program.verbose) {
	stdioStyle = 'inherit';
}

pathRoot = path.resolve(projectName);

if (['back', 'front', 'mobile'].indexOf(actionType) == -1) {
	log('Problem.');
}

log('Creating app by ' + chalk.cyan(nickelPackageName) + ' at ' + chalk.green(pathRoot));

fetchInstaller();