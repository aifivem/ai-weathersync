name 'ai-weathersync'
author 'TGIANN'
version '0.1.0'
license 'GPL-3.0-only'
description 'Time and weather synced for everyone, set in the admin panel'
repository 'https://github.com/TGIANN/ai-weathersync'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_script 'dist/client.js'
server_script 'dist/server.js'


dependencies {
	'/onesync',
	'ai-core',
}

files {
	'locales/*.json',
	'data/settings.json',
}
provide 'qb-weathersync'
