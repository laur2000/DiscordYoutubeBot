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
        withCredentials([string(credentialsId: 'DISCORD_TOKEN', variable: 'DISCORD_TOKEN')])
        sh 'docker run -d --rm -e DISCORD_TOKEN=\'${DISCORD_TOKEN}\' discord-bot'
      }
    }

  }

}
