# lessd

A file/directory watching daemon for Less.

## Running

Simply `bin/lessd <path_to_config>`.

## Configuration

Configuration is done using JSON.  Any relative paths are relative to the config file.

### Sample

	{
		"compile_on_start": true,
		"log": "./less.log",
		"compress": true,
		"projects": {
			"mysite": {
				"watch": "./mysite/less/",
				"run": "./mysite/less/style.less",
				"output": "./mysite/css/style.css",
				"log": "./mysite/less.log"
			},
			"anothersite": {
				"watch": [
					"./anothersite/less/",
					"./common_less/"
				],
				"run": "./anothersite/less/style.less",
				"output": "./anothersite/css/style.css"
				"log": false,
				"compress": false
			}
		}
	}

### compile_on_start

Set to `true`, the project will be compiled when lessd is started.  Defaults to `false`. This can be overridden per project.

### log

Location of the global log file. The global log will be used by projects that haven't specified their own log or have turned off logging.
To turn off logging, set `log` to `false` in the project specification.

### compress

Set to `true` to compress the generated `.css`. Defaults to `false`. This can be overridden per project.

### projects

A list of project specifications. Each project is an object with the project name or alias as the key.

### watch

A string or array of strings of directories to watch for changes.

### run

The path to the initial `.less` file to run when compiling the project.

### output

The path to output the compiled `.css` file.
