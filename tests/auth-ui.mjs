import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
const output=process.env.TEST_OUTPUT_DIR || '/tmp/letsdebate-auth-qa';
const browser=await chromium.launch({headless:true});
try {
 fs.mkdirSync(output,{recursive:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 let session={configured:false,user:null};
 let failedSession=false;
 await page.route('**/api/auth/session',route=>route.fulfill(failedSession ? {status:503,json:{error:'로그인 상태 확인 오류'}} : {json:session}));
 await page.route('**/api/account',route=>route.fulfill({json:{match:{limit:3,remaining:2},assist:{limit:30,remaining:30},recent:[{id:'run-1',operation:'match',status:'completed',createdAt:'2026-09-06T04:00:00Z'}]}}));
 await page.route('**/api/auth/logout',route=>{session={configured:true,user:null};return route.fulfill({json:{success:true}});});
 let next=null;
 await page.route('**/api/auth/login',route=>{
  next=route.request().postDataJSON().next;
  session={configured:true,user:{id:'qa-auth-user',name:'테스트 팬'}};
  return route.fulfill({json:{url:base+'/account'}});
 });
 await page.goto(base+'/login');
 await page.getByText('로그인 오픈을 준비하고 있어요').waitFor();
 assert.equal(await page.getByRole('button',{name:'Google로 계속하기'}).isDisabled(),true);
 session={configured:true,user:null};
 await page.goto(base+'/login?next=%2Ftournament%3Fid%3Dqa-bracket');
 await page.getByRole('button',{name:'Google로 계속하기'}).waitFor({state:'visible'});
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'login overflow '+width);
 }
 await page.screenshot({path:output+'/login-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:output+'/login-mobile.png'});
 await page.getByRole('button',{name:'Google로 계속하기'}).click();
 await page.waitForURL('**/account');
 assert.equal(next,'/tournament?id=qa-bracket');
 await page.getByText('2 / 3',{exact:true}).waitFor();
 await page.screenshot({path:output+'/account-mobile.png'});
 await page.getByRole('button',{name:'로그아웃',exact:true}).click();
 await page.getByRole('link',{name:'로그인하기',exact:true}).waitFor();
 assert.equal(await page.getByText('테스트 팬 님의 AI 배틀 이용 내역').count(),0);
 failedSession=true;
 await page.goto(base+'/login');
 await page.getByRole('alert').filter({hasText:'로그인 상태 확인 오류'}).waitFor();
 failedSession=false;
 await page.getByRole('button',{name:'다시 확인'}).click();
 await page.getByRole('alert').filter({hasText:'로그인 상태 확인 오류'}).waitFor({state:'detached'});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',checks:['unconfigured login','OAuth return path','login and account UI','logout','session error recovery','320-1440px layouts'],screenshots:output},null,2));
} finally {await browser.close();}
