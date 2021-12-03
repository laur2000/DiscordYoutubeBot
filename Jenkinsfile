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
          sh 'docker run --rm -e DISCORD_TOKEN=\'${DISCORD_TOKEN}\' discord-bot'
        }

      }
    }

  }
}