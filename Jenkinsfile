pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        sh 'docker build --tag discord-bot .'
      }
    }

    stage('Run') {
      steps {
        withCredentials(bindings: [string(credentialsId: 'DISCORD_TOKEN', variable: 'DISCORD_TOKEN')]) {
	  sh 'echo DISCORD_TOKEN=${DISCORD_TOKEN} > .env'
          sh 'docker-compose up -d'
        }

      }
    }
  }
}
