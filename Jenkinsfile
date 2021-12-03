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
        sh 'docker run discord-bot'
      }
    }

  }
}