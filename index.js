'use strict';

 process.env.DEBUG = 'actions-on-google:*';
 const App = require('actions-on-google').DialogflowApp;
 const functions = require('firebase-functions');
 

 // DialogflowのIntentで指定したAction名
 const WELCOME_ACTION = 'input.welcome';
 const ANSWER_PERMISSION_ACTION = "answer_permission"
 const SAY_THAT_AGAIN_ACTION = "say_that_again"
 const DECIDE_WHICH_BURGER_ACTION = "decide_which_burger"
 const CONFIRM_ACTION = "confirm"

 const SAY_THAT_AGAIN_PREFIX = "さっきは"
 const SAY_THAT_AGAIN_SUFFIX = "と言いました。"
 let buildLastPrompt = (text)=>{
  return SAY_THAT_AGAIN_PREFIX+text+SAY_THAT_AGAIN_SUFFIX
 }
 
 exports.googme_home_demo = functions.https.onRequest((request, response) => {
   const app = new App({request, response});
   console.log('Request headers: ' + JSON.stringify(request.headers));
   console.log('Request body: ' + JSON.stringify(request.body));


   let welcome = (app)=>{
    //ユーザがアプリを使ったことがある場合は話す内容を変える。
    if (app.userStorage.displayName && app.userStorage.burger) {
      let text = `こんにちは。${app.userStorage.displayName}さん。前回は${app.userStorage.burger}を注文しましたが。今回も同じものを注文しますか？`
      app.data.lastPrompt = buildLastPrompt(text)
      app.askForConfirmation(text)
    }else{
      let text = "こんにちは。このアプリでは出前の注文ができます。何が食べたいですか？"
      app.ask({
        speech: text
      });
    }
  }

  let decideWhichBurger = (app)=>{
    let burger = app.getArgument("BURGER");
    app.userStorage.burger = burger
    let namePermission = app.SupportedPermissions.NAME;
    let preciseLocationPermission = app.SupportedPermissions.DEVICE_PRECISE_LOCATION
    //askForPermissionsでユーザの名前とデバイスのロケーションを取得を要求する
    app.askForPermissions(burger+'ですね。ご注文には',
    [namePermission, preciseLocationPermission]);
  }

  //ユーザがアプリにパーミッションを与えたら正常に注文完了
  //Event: actions_intent_PERMISSION が設定されているIntentがから呼び出される
  let answerPermission = (app)=>{
    if (app.isPermissionGranted()) {
      let displayName = app.getUserName().displayName;
      app.userStorage.displayName = displayName
      let textToSpeech = `ありがとうございます。${displayName}さん。では３０分後に${app.userStorage.burger}をお届けしますね。`
      app.tell(textToSpeech);
    }else{
      app.tell("配達には名前と住所が必要です。残念ですが注文を完了できませんでした。アプリを終了します。");      
    }
  }

  //直前の内容をもう一度話す
  let sayThatAgain = (app)=>{
    app.ask({
        speech: app.data.lastPrompt
    });
  }

  //Event: action_intent_CONFIRMATIONが設定されているIntentから呼び出される
  let confirmHandler = (app)=>{
    if (app.getUserConfirmation()) {
      app.tell(`では30分後に${app.userStorage.burger}をお届けしますね。いましばらくお待ち下さい。`);
    } else {
      let text = "わかりました。今回は何が食べたいですか？"
      app.data.lastPrompt = buildLastPrompt(text)
      app.ask({
        speech: text
      });
    }
  }


   let actionMap = new Map();
   actionMap.set(WELCOME_ACTION, welcome);
   actionMap.set(DECIDE_WHICH_BURGER_ACTION, decideWhichBurger);
   actionMap.set(ANSWER_PERMISSION_ACTION, answerPermission);
   actionMap.set(SAY_THAT_AGAIN_ACTION, sayThatAgain);
   actionMap.set(CONFIRM_ACTION, confirmHandler);
   app.handleRequest(actionMap);
 });