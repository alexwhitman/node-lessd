# node-lessd

A file/directory watching daemon for Less.

## Running

Simply `bin/lessd <path_to_config>`.

## Configuration

Configuration is done using JSON.  Any relative paths are relative to the config file.

### Sample

	{
		"build_on_start": true,
		"projects": {
			"mysite": {
				"watch": "./mysite/less/",
				"run": "./mysite/less/style.less",
				"output": "./mysite/css/style.less"
			},
			"anothersite": {
				"watch": [
					"./anothersite/less/",
					"./common_less/"
				],
				"run": "./anothersite/less/style.less",
				"output": "./anothersite/css/style.less"
			}
		}
	}
