// BigCat Social Growth MVP
// 1) Replace these two values after making a Supabase project.
const SUPABASE_URL = 'https://fhrknlmxbgqfeqvglbmo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xyreo5ablTJ9nTStil0CvA_4r8cc6z_';

const supabaseClient = (SUPABASE_URL.startsWith('https://'))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const DEMO_SCHOOL_ID = null; // optional: set after creating a school record.
const areas = [
  ['empathy','공감성'], ['cooperation','협동성'], ['self_control','감정조절'],
  ['rule_understanding','규칙이해'], ['social_confidence','사회적 자신감'], ['care','배려'],
  ['problem_solving','문제해결'], ['relationship','관계형성'], ['responsibility','책임감'], ['prosocial','친사회성']
];

const questions = [
  {t:'🐰 토끼 친구가 혼자 울고 있어요. 어떻게 할까요?', a:[['왜 우는지 물어봐요','empathy',5],['선생님께 알려요','care',4],['그냥 지나가요','empathy',1]]},
  {t:'🧱 친구가 내 블록을 가져갔어요.', a:[['같이 쓰자고 말해요','cooperation',5],['화내요','self_control',1],['말없이 포기해요','social_confidence',2]]},
  {t:'🎲 게임에서 졌어요.', a:[['다음에 다시 해봐요','self_control',5],['울어요','self_control',2],['친구에게 화내요','self_control',1]]},
  {t:'🎢 놀이기구 줄을 서야 해요.', a:[['차례를 기다려요','rule_understanding',5],['앞으로 뛰어가요','rule_understanding',1],['친구가 하는 대로 따라해요','relationship',3]]},
  {t:'🦊 새 친구가 우리 반에 왔어요.', a:[['먼저 이름을 물어봐요','relationship',5],['멀리서 지켜봐요','social_confidence',3],['관심 없어요','relationship',1]]},
  {t:'🎁 친구가 장난감을 같이 쓰고 싶대요.', a:[['번갈아 쓰자고 해요','care',5],['내 것이라고 해요','care',1],['선생님께 정해달라고 해요','problem_solving',4]]},
  {t:'🐻 친구와 의견이 달라요.', a:[['서로 말해보고 방법을 찾아요','problem_solving',5],['내 말만 맞다고 해요','cooperation',1],['놀이를 그만둬요','social_confidence',2]]},
  {t:'🌱 친구가 정리를 힘들어해요.', a:[['같이 정리해줘요','prosocial',5],['선생님을 불러요','care',4],['내 것만 정리해요','prosocial',2]]},
  {t:'🍪 내가 실수로 친구 그림을 망쳤어요.', a:[['미안하다고 말하고 도와줘요','responsibility',5],['모른 척해요','responsibility',1],['선생님께만 말해요','responsibility',3]]},
  {t:'🏆 팀 미션을 해야 해요.', a:[['역할을 나눠 함께 해요','cooperation',5],['혼자 빨리 해요','cooperation',2],['친구가 하게 둬요','responsibility',2]]}
];

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function renderQuiz(){
  const box = document.getElementById('quizBox');
  box.innerHTML = questions.map((q,i)=>`<div class="q"><div class="q-title">${i+1}. ${q.t}</div><div class="choices">${q.a.map((c,j)=>`<label class="choice"><input type="radio" name="q${i}" value="${j}" ${j===0?'checked':''}/> ${c[0]}</label>`).join('')}</div></div>`).join('');
}

function renderTeacherScores(){
  const box = document.getElementById('teacherScores');
  box.innerHTML = areas.map(([key,label])=>`<label>${label}<select id="score_${key}"><option value="40">미발달</option><option value="65" selected>보통</option><option value="90">잘함</option></select></label>`).join('');
}

function calcParentScores(){
  const scores = Object.fromEntries(areas.map(([k])=>[k,50]));
  const answers = [];
  questions.forEach((q,i)=>{
    const picked = Number(document.querySelector(`input[name="q${i}"]:checked`)?.value || 0);
    const [text, area, value] = q.a[picked];
    answers.push({question:q.t, answer:text, area, value});
    scores[area] = Math.min(100, Math.round((scores[area] + value*10) / 1.45));
  });
  return {scores, answers};
}

function localSave(key, data){
  const arr = JSON.parse(localStorage.getItem(key)||'[]');
  arr.push(data); localStorage.setItem(key, JSON.stringify(arr));
}

async function submitParentAssessment(phase){
  const child_name = document.getElementById('childName').value.trim();
  if(!child_name){ alert('아이 이름을 입력해주세요.'); return; }
  const child = {
    school_id: DEMO_SCHOOL_ID,
    child_name,
    birth_date: document.getElementById('birthDate').value || null,
    gender: document.getElementById('gender').value,
    siblings: document.getElementById('siblings').value,
    previous_school_experience: document.getElementById('experience').value,
    guardian_name: document.getElementById('guardianName').value,
    guardian_phone: document.getElementById('guardianPhone').value
  };
  const {scores, answers} = calcParentScores();
  const ai_summary = makeSummary(child_name, scores, phase);
  try{
    if(supabaseClient){
      const {data: childData, error: childErr} = await supabaseClient.from('children').insert(child).select().single();
      if(childErr) throw childErr;
      const {error: assessErr} = await supabaseClient.from('parent_assessments').insert({child_id:childData.id, phase, answers, scores, ai_summary});
      if(assessErr) throw assessErr;
      document.getElementById('parentMsg').textContent = `저장 완료! 아동 ID: ${childData.id}`;
    } else {
      const id = crypto.randomUUID();
      localSave('children', {...child, id});
      localSave('parent_assessments', {child_id:id, phase, answers, scores, ai_summary});
      document.getElementById('parentMsg').textContent = `로컬 저장 완료! Supabase 키를 넣으면 DB에 저장됩니다. 아동 ID: ${id}`;
    }
  }catch(e){
    console.error(e); document.getElementById('parentMsg').textContent = `저장 오류: ${e.message}`;
  }
}

function makeSummary(name, scores, phase){
  const top = Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k])=>areas.find(a=>a[0]===k)[1]).join(', ');
  return `${name}은(는) ${phase==='initial'?'초기 사회성 탐험':'가정 재평가'}에서 ${top} 영역이 강점으로 나타났습니다. 친구와 함께하는 경험을 꾸준히 제공하면 사회적 자신감과 자기조절이 더 안정적으로 성장할 수 있습니다.`;
}

async function loadChildren(){
  let children=[];
  if(supabaseClient){
    const {data,error}=await supabaseClient.from('children').select('*').order('created_at',{ascending:false}).limit(50);
    if(error){ alert(error.message); return; }
    children=data;
  } else children=JSON.parse(localStorage.getItem('children')||'[]').reverse();
  document.getElementById('childrenList').innerHTML = children.map(c=>`<div class="child-item" onclick="selectChild('${c.id}','${c.child_name}')"><strong>${c.child_name}</strong><br><small>${c.id}</small><br><small>${c.guardian_name||''} ${c.guardian_phone||''}</small></div>`).join('') || '아동 데이터가 없습니다.';
}

function selectChild(id,name){
  document.getElementById('selectedChildId').value=id;
  document.getElementById('reportChildId').value=id;
  document.getElementById('teacherMsg').textContent=`${name} 선택됨`;
  showPage('teacher');
}

async function submitTeacherAssessment(){
  const child_id=document.getElementById('selectedChildId').value;
  if(!child_id){ alert('아동을 먼저 선택해주세요.'); return; }
  const row={ child_id, phase:document.getElementById('teacherPhase').value, teacher_comment:document.getElementById('teacherComment').value };
  areas.forEach(([k])=> row[k]=Number(document.getElementById(`score_${k}`).value));
  try{
    if(supabaseClient){
      const {error}=await supabaseClient.from('teacher_assessments').insert(row);
      if(error) throw error;
    } else localSave('teacher_assessments', row);
    document.getElementById('teacherMsg').textContent='교사 평가 저장 완료';
  }catch(e){ document.getElementById('teacherMsg').textContent=`저장 오류: ${e.message}`; }
}

async function generateReport(){
  const child_id=document.getElementById('reportChildId').value.trim();
  if(!child_id){ alert('아동 ID를 입력해주세요.'); return; }
  let child, parents=[], teachers=[];
  if(supabaseClient){
    const c=await supabaseClient.from('children').select('*').eq('id',child_id).single();
    if(c.error){ alert(c.error.message); return; }
    child=c.data;
    parents=(await supabaseClient.from('parent_assessments').select('*').eq('child_id',child_id)).data||[];
    teachers=(await supabaseClient.from('teacher_assessments').select('*').eq('child_id',child_id)).data||[];
  } else {
    child=(JSON.parse(localStorage.getItem('children')||'[]')).find(x=>x.id===child_id);
    parents=(JSON.parse(localStorage.getItem('parent_assessments')||'[]')).filter(x=>x.child_id===child_id);
    teachers=(JSON.parse(localStorage.getItem('teacher_assessments')||'[]')).filter(x=>x.child_id===child_id);
  }
  if(!child){ alert('아동 정보를 찾지 못했습니다.'); return; }
  const initial=parents.find(p=>p.phase==='initial')?.scores || {};
  const sem1=teachers.find(t=>t.phase==='semester1') || {};
  const home=parents.find(p=>p.phase==='home_growth')?.scores || {};
  const sem2=teachers.find(t=>t.phase==='semester2') || {};
  const finalScores={};
  areas.forEach(([k])=> finalScores[k]=Math.round(avg([initial[k], sem1[k], home[k], sem2[k]].filter(Boolean))||0));
  const strongest = Object.entries(finalScores).sort((a,b)=>b[1]-a[1])[0];
  const strongLabel = strongest ? areas.find(a=>a[0]===strongest[0])[1] : '사회성';
  document.getElementById('reportOutput').innerHTML=`<h3>🌱 ${child.child_name}의 사회성 성장 이야기</h3><p><strong>강점 영역:</strong> ${strongLabel}</p><p>${child.child_name}은(는) 한 해 동안 친구와 함께 놀이하고 규칙을 경험하며 사회성이 성장하고 있습니다. 초기 가정 관찰, 교사 관찰, 가정 재평가, 2학기 관찰을 종합하여 성장 흐름을 확인할 수 있습니다.</p><p><strong>가정 연계 제안:</strong> 보드게임, 역할놀이, 차례 기다리기 놀이를 통해 감정조절과 협동성을 자연스럽게 연습해보세요.</p>`;
  drawChart(initial, sem1, sem2, finalScores);
}
function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+Number(b),0)/arr.length : 0; }
let chart;
function drawChart(initial, sem1, sem2, finalScores){
  const labels = areas.slice(0,5).map(a=>a[1]);
  const keys = areas.slice(0,5).map(a=>a[0]);
  const data = {
    labels,
    datasets:[
      {label:'초기', data:keys.map(k=>initial[k]||0)},
      {label:'1학기', data:keys.map(k=>sem1[k]||0)},
      {label:'2학기/종합', data:keys.map(k=>finalScores[k]||0)}
    ]
  };
  if(chart) chart.destroy();
  chart = new Chart(document.getElementById('growthChart'), {type:'bar', data, options:{responsive:true, scales:{y:{min:0,max:100}}}});
}

renderQuiz(); renderTeacherScores();
