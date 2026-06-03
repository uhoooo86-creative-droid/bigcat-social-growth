// BigCat Social Growth MVP
// 1) Replace these two values after making a Supabase project.
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabaseClient =
  window.supabase && SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.startsWith('sb_')
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

function esc(value){
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function renderQuiz(){
  const box = document.getElementById('quizBox');
  if(!box) return;
  box.innerHTML = questions.map((q,i)=>`<div class="q"><div class="q-title">${i+1}. ${esc(q.t)}</div><div class="choices">${q.a.map((c,j)=>`<label class="choice"><input type="radio" name="q${i}" value="${j}" ${j===0?'checked':''}/> ${esc(c[0])}</label>`).join('')}</div></div>`).join('');
}

function renderTeacherScores(){
  const box = document.getElementById('teacherScores');
  if(!box) return;
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

function localGet(key){ return JSON.parse(localStorage.getItem(key)||'[]'); }
function localSet(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }
function localSave(key, data){ const arr = localGet(key); arr.push(data); localSet(key, arr); }
function localUpdate(key, id, patch){ localSet(key, localGet(key).map(x=>String(x.id)===String(id) ? {...x, ...patch} : x)); }
function localDelete(key, predicate){ localSet(key, localGet(key).filter(x=>!predicate(x))); }

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
      localSave('children', {...child, id, created_at:new Date().toISOString()});
      localSave('parent_assessments', {id:crypto.randomUUID(), child_id:id, phase, answers, scores, ai_summary, created_at:new Date().toISOString()});
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
    const {data,error}=await supabaseClient.from('children').select('*').order('created_at',{ascending:false}).limit(100);
    if(error){ alert(error.message); return; }
    children=data || [];
  } else children=localGet('children').reverse();
  const list = document.getElementById('childrenList');
  list.innerHTML = children.map(c=>`
    <div class="child-item">
      <div onclick="selectChild('${esc(c.id)}','${esc(c.child_name)}')">
        <strong>${esc(c.child_name)}</strong><br>
        <small>${esc(c.id)}</small><br>
        <small>${esc(c.guardian_name||'')} ${esc(c.guardian_phone||'')}</small>
      </div>
      <div class="row-actions">
        <button class="mini" onclick="selectChild('${esc(c.id)}','${esc(c.child_name)}')">선택</button>
        <button class="mini" onclick="openEditChild('${esc(c.id)}')">수정</button>
        <button class="mini danger" onclick="deleteChild('${esc(c.id)}','${esc(c.child_name)}')">삭제</button>
      </div>
    </div>`).join('') || '아동 데이터가 없습니다.';
}

async function getChildById(id){
  if(supabaseClient){
    const {data,error}=await supabaseClient.from('children').select('*').eq('id',id).single();
    if(error) throw error;
    return data;
  }
  return localGet('children').find(x=>String(x.id)===String(id));
}

async function selectChild(id,name){
  document.getElementById('selectedChildId').value=id;
  document.getElementById('reportChildId').value=id;
  document.getElementById('teacherMsg').textContent=`${name} 선택됨`;
  await openEditChild(id, false);
  await loadTeacherAssessments(id);
  showPage('teacher');
}

async function openEditChild(id, scroll=true){
  try{
    const c = await getChildById(id);
    if(!c) throw new Error('아동 정보를 찾지 못했습니다.');
    document.getElementById('editChildId').value = c.id;
    document.getElementById('editChildName').value = c.child_name || '';
    document.getElementById('editBirthDate').value = c.birth_date || '';
    document.getElementById('editGender').value = c.gender || '선택 안 함';
    document.getElementById('editSiblings').value = c.siblings || '';
    document.getElementById('editExperience').value = c.previous_school_experience || '';
    document.getElementById('editGuardianName').value = c.guardian_name || '';
    document.getElementById('editGuardianPhone').value = c.guardian_phone || '';
    document.getElementById('editMemo').value = c.memo || '';
    document.getElementById('editChildBox').style.display = 'block';
    if(scroll) document.getElementById('editChildBox').scrollIntoView({behavior:'smooth', block:'start'});
  }catch(e){ alert(e.message); }
}

function closeEditChild(){ document.getElementById('editChildBox').style.display='none'; }

async function updateChild(){
  const id=document.getElementById('editChildId').value;
  if(!id){ alert('수정할 아동을 선택해주세요.'); return; }
  const patch={
    child_name: document.getElementById('editChildName').value.trim(),
    birth_date: document.getElementById('editBirthDate').value || null,
    gender: document.getElementById('editGender').value,
    siblings: document.getElementById('editSiblings').value,
    previous_school_experience: document.getElementById('editExperience').value,
    guardian_name: document.getElementById('editGuardianName').value,
    guardian_phone: document.getElementById('editGuardianPhone').value,
    memo: document.getElementById('editMemo').value
  };
  if(!patch.child_name){ alert('아이 이름은 비울 수 없습니다.'); return; }
  try{
    if(supabaseClient){
      const {error}=await supabaseClient.from('children').update(patch).eq('id',id);
      if(error) throw error;
    } else localUpdate('children', id, patch);
    document.getElementById('teacherMsg').textContent='아동 정보 수정 완료';
    document.getElementById('selectedChildId').value=id;
    document.getElementById('reportChildId').value=id;
    await loadChildren();
  }catch(e){ alert(`수정 오류: ${e.message}`); }
}

async function deleteChild(id,name){
  const ok = confirm(`${name} 아동 정보를 삭제할까요?\n\n부모 평가, 교사 평가, 리포트도 함께 삭제됩니다.`);
  if(!ok) return;
  try{
    if(supabaseClient){
      const {error}=await supabaseClient.from('children').delete().eq('id',id);
      if(error) throw error;
    } else {
      localDelete('children', x=>String(x.id)===String(id));
      localDelete('parent_assessments', x=>String(x.child_id)===String(id));
      localDelete('teacher_assessments', x=>String(x.child_id)===String(id));
      localDelete('reports', x=>String(x.child_id)===String(id));
    }
    if(document.getElementById('selectedChildId').value===id) clearTeacherForm();
    document.getElementById('teacherMsg').textContent='아동 삭제 완료';
    await loadChildren();
  }catch(e){ alert(`삭제 오류: ${e.message}\n\nSupabase SQL Editor에서 delete policy를 추가해야 할 수 있습니다.`); }
}

function clearTeacherForm(){
  document.getElementById('selectedChildId').value='';
  document.getElementById('reportChildId').value='';
  document.getElementById('editingAssessmentId').value='';
  document.getElementById('teacherComment').value='';
  document.getElementById('teacherPhase').value='semester1';
  areas.forEach(([k])=> document.getElementById(`score_${k}`).value='65');
  document.getElementById('assessmentList').innerHTML='';
  closeEditChild();
}

async function submitTeacherAssessment(){
  const child_id=document.getElementById('selectedChildId').value;
  if(!child_id){ alert('아동을 먼저 선택해주세요.'); return; }
  const editingId=document.getElementById('editingAssessmentId').value;
  const row={ child_id, phase:document.getElementById('teacherPhase').value, teacher_comment:document.getElementById('teacherComment').value };
  areas.forEach(([k])=> row[k]=Number(document.getElementById(`score_${k}`).value));
  try{
    if(supabaseClient){
      const q = editingId
        ? supabaseClient.from('teacher_assessments').update(row).eq('id',editingId)
        : supabaseClient.from('teacher_assessments').insert(row);
      const {error}=await q;
      if(error) throw error;
    } else {
      if(editingId) localUpdate('teacher_assessments', editingId, row);
      else localSave('teacher_assessments', {...row, id:crypto.randomUUID(), created_at:new Date().toISOString()});
    }
    document.getElementById('teacherMsg').textContent= editingId ? '교사 평가 수정 완료' : '교사 평가 저장 완료';
    cancelEditAssessment();
    await loadTeacherAssessments(child_id);
  }catch(e){ document.getElementById('teacherMsg').textContent=`저장 오류: ${e.message}`; }
}

async function loadTeacherAssessments(childId){
  const child_id = childId || document.getElementById('selectedChildId').value;
  if(!child_id){ document.getElementById('assessmentList').innerHTML='아동을 먼저 선택해주세요.'; return; }
  let rows=[];
  if(supabaseClient){
    const {data,error}=await supabaseClient.from('teacher_assessments').select('*').eq('child_id',child_id).order('created_at',{ascending:false});
    if(error){ document.getElementById('assessmentList').textContent=error.message; return; }
    rows=data || [];
  } else rows=localGet('teacher_assessments').filter(x=>String(x.child_id)===String(child_id)).reverse();
  document.getElementById('assessmentList').innerHTML = rows.map(r=>`
    <div class="assessment-item">
      <strong>${r.phase==='semester1'?'1학기':'2학기'}</strong>
      <small>${esc((r.created_at||'').slice(0,10))}</small>
      <p>${esc(r.teacher_comment || '코멘트 없음')}</p>
      <div class="row-actions">
        <button class="mini" onclick="editAssessment('${esc(r.id)}')">수정</button>
        <button class="mini danger" onclick="deleteAssessment('${esc(r.id)}')">삭제</button>
      </div>
    </div>`).join('') || '저장된 교사 평가가 없습니다.';
}

async function getAssessmentById(id){
  if(supabaseClient){
    const {data,error}=await supabaseClient.from('teacher_assessments').select('*').eq('id',id).single();
    if(error) throw error;
    return data;
  }
  return localGet('teacher_assessments').find(x=>String(x.id)===String(id));
}

async function editAssessment(id){
  try{
    const r = await getAssessmentById(id);
    if(!r) throw new Error('평가 정보를 찾지 못했습니다.');
    document.getElementById('editingAssessmentId').value = r.id;
    document.getElementById('selectedChildId').value = r.child_id;
    document.getElementById('teacherPhase').value = r.phase;
    document.getElementById('teacherComment').value = r.teacher_comment || '';
    areas.forEach(([k])=> document.getElementById(`score_${k}`).value = String(r[k] ?? 65));
    document.getElementById('teacherMsg').textContent='기존 평가를 불러왔습니다. 수정 후 저장하세요.';
    document.getElementById('teacherFormTitle').textContent='✏️ 교사 관찰 수정';
  }catch(e){ alert(e.message); }
}

function cancelEditAssessment(){
  document.getElementById('editingAssessmentId').value='';
  document.getElementById('teacherFormTitle').textContent='📝 교사 관찰 입력';
  document.getElementById('teacherComment').value='';
  areas.forEach(([k])=> document.getElementById(`score_${k}`).value='65');
}

async function deleteAssessment(id){
  if(!confirm('이 교사 평가를 삭제할까요?')) return;
  const child_id=document.getElementById('selectedChildId').value;
  try{
    if(supabaseClient){
      const {error}=await supabaseClient.from('teacher_assessments').delete().eq('id',id);
      if(error) throw error;
    } else localDelete('teacher_assessments', x=>String(x.id)===String(id));
    document.getElementById('teacherMsg').textContent='교사 평가 삭제 완료';
    await loadTeacherAssessments(child_id);
    if(document.getElementById('editingAssessmentId').value===id) cancelEditAssessment();
  }catch(e){ alert(`삭제 오류: ${e.message}\n\nSupabase SQL Editor에서 delete policy를 추가해야 할 수 있습니다.`); }
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
    child=localGet('children').find(x=>x.id===child_id);
    parents=localGet('parent_assessments').filter(x=>x.child_id===child_id);
    teachers=localGet('teacher_assessments').filter(x=>x.child_id===child_id);
  }
  if(!child){ alert('아동 정보를 찾지 못했습니다.'); return; }
  const initial=parents.find(p=>p.phase==='initial')?.scores || {};
  const sem1=teachers.find(t=>t.phase==='semester1') || {};
  const home=parents.find(p=>p.phase==='home_growth')?.scores || {};
  const sem2=teachers.find(t=>t.phase==='semester2') || {};
  const finalScores={};
  areas.forEach(([k])=> finalScores[k]=Math.round(avg([initial[k], sem1[k], home[k], sem2[k]].filter(Boolean))||0));
  const strongest = Object.entries(finalScores).sort((a,b)=>b[1]-a[1])[0];
  const weakest = Object.entries(finalScores).sort((a,b)=>a[1]-b[1])[0];
  const strongLabel = strongest ? areas.find(a=>a[0]===strongest[0])[1] : '사회성';
  const supportLabel = weakest ? areas.find(a=>a[0]===weakest[0])[1] : '사회성';
  document.getElementById('reportOutput').innerHTML=`<h3>🌱 ${esc(child.child_name)}의 사회성 성장 이야기</h3><p><strong>강점 영역:</strong> ${esc(strongLabel)}</p><p><strong>지원 영역:</strong> ${esc(supportLabel)}</p><p>${esc(child.child_name)}은(는) 한 해 동안 친구와 함께 놀이하고 규칙을 경험하며 사회성이 성장하고 있습니다. 초기 가정 관찰, 교사 관찰, 가정 재평가, 2학기 관찰을 종합하여 성장 흐름을 확인할 수 있습니다.</p><p><strong>가정 연계 제안:</strong> 보드게임, 역할놀이, 차례 기다리기 놀이를 통해 감정조절과 협동성을 자연스럽게 연습해보세요.</p>`;
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
