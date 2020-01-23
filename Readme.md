
#Whisperation 2 

## General ##
This work consists of generic, rich full-stack frame-work/infrastructure
for simple and sophisticated web applications.

The generic parts are clearly separated from the application specific part, using sub-directories.

##Generic Components##
### Front End ###
1. administration module, that include:
    1. basic user management
    1. journal viewer
    1. model (db) browser (with editing)
1. Session management, including login, signup, restore, remember, status
1. Sophisticated pub/sub integrated with server events via websockets
1. Router
1. Application state manager  
1. Full user notifications and messages inbox
1. REST API helper and view-model basis, including spinners, error handling, etc
1. Default layout and styling, schema based, including responsiveness 
1. Components:
    1. login
    1. sign up
    1. inbox 
    1. rating
    1. toasters
    1. lightbox
    1. zippy
    1. item selector
    1. pager
    1. administration related widgets 
    1. utility widgets 
    

## Environment variables configuration

### Server
HOSTNAME 

PORT 

USE_HTTPS - in production it is true by default

### Run mode related 
RUN_MODE - either "test" or "production"
 
FORCE_SEND_EMAIL - set to truthy to send email even in test mode 

The log folder - it is: `${(process.env.LOG_FOLDER || '/opt/logs')}/${applicationName}/${RunMode[runMode].toString()}/`
The base log folder should exist, with write permissions to this application, and the sub-directories would be created by the application.

### Authentication 
FB_CLIENT_ID, FB_CLIENT_SECRET
  
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 
### Database 
the db url is DB_URL or `mongodb://${(process.env.DB_HOST || await getDockerHostIp() || 'localhost')}:${(process.env.DB_PORT || 27017)}/${getDatabaseName()}`
the database name is DB_NAME which can be set to 'auto' or unset. If unset, the url must have the db name. 
    
### Email Transport     
EMAIL_TRANSPORT_USER,

EMAIL_TRANSPORT_PW
 
### SMS Transport
The SMS transport provider is Nexemo. An account should be made for that service. 
NEXMO_API_SECRET
 
NEXMO_API_KEY
  