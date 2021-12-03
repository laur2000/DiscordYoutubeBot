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
        sh 'docker run -d --rm -e DISCORD_TOKEN=\'${env.DISCORD_TOKEN}\' discord-bot'
      }
    }

  }
  environment {
    DISCORD_TOKEN = 'ODk4NzAzMTM3NDM3Nzg2MTYy.YWoEhQ.3jY8WC4riI7mBBrZvKt0Lhhqx1k'
  }
}