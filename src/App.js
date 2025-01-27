import { useState, useEffect, useCallback } from "react";
import {Layout, Col, Row, Spin} from 'antd';
import 'antd/dist/reset.css';
import './styles/App.css';
//import axios from 'axios';

/** React components */
import { NavBar } from "./components/nav";
import { NewsContent } from "./components/content";

/** Cases */
import caseArticle from './data/case.json';
/** Resources */
import fallacyList from './resource/config.json';
import caseList from "./resource/cases.json";

function App() {
  const [version, setVersion] = useState("cases");
  const [selectedCase, setSelectedCase] = useState(0);
  const [errSentence, setErrSentence] = useState([]);
  const [fallacyChatList, setFallacyChatList] = useState([]);
  const [imageFlag, setImageFlag] = useState(false);
  const [taglist, setTagList] = useState([]);

  const { Header, Content } = Layout;
  const activeArticle = caseArticle.cases[selectedCase];
  const activeFallacyCase = caseList[version][selectedCase];


  const newStyle = {
    backgroundColor: '#fff',
    padding: 20
  };

  const initConfig = useCallback(()=>{
    const config = JSON.parse(JSON.stringify(fallacyList.FallacyType));
    Object.keys(config).forEach(key=>config[key].chatList = []);

    activeFallacyCase.fallacies.logical_fallacies.forEach(e=>{
      /** !!! THIS PART NEED TO BE UPDATED AFTER PROMPT UPDATEING !!! */
      const L1Link = activeFallacyCase.fallacies.annotations[e].L1[0].link !== undefined ? 
      activeFallacyCase.fallacies.annotations[e].L1[0].link : "";
      const L2Link = activeFallacyCase.fallacies.annotations[e].L2[0].link !== undefined ? 
      activeFallacyCase.fallacies.annotations[e].L2[0].link : "";
      const L3Link = activeFallacyCase.fallacies.annotations[e].L3[0].link !== undefined ? 
      activeFallacyCase.fallacies.annotations[e].L3[0].link : "";
      //console.log(L1Link);
      const chatList = [
        {
          role: "assistant",
          content: activeFallacyCase.fallacies.annotations[e].L1[0].explanation,
          link: L1Link
        },{
          role: "assistant",
          content: activeFallacyCase.fallacies.annotations[e].L2[0].explanation,
          link: L2Link
        },{
          role: "assistant",
          content: activeFallacyCase.fallacies.annotations[e].L3[0].explanation,
          link: L3Link
        }
      ];
      config[e].chatList = chatList;
      config[e].level = 'L1';
      config[e].open = false;
      config[e].fsource = "text";
      setFallacyChatList(config);
    });

    activeFallacyCase.text_chart_linkage !== null && activeFallacyCase.text_chart_linkage.fallacies.forEach(e=>{
      const L1annotation = activeFallacyCase.text_chart_linkage.annotations[e].L1;
      const L2annotation = activeFallacyCase.text_chart_linkage.annotations[e].L2;
      const L3annotation = activeFallacyCase.text_chart_linkage.annotations[e].L3;
      const chatList = [
        {
          role: "assistant",
          content: L1annotation
        },{
          role: "assistant",
          content: L2annotation
        },{
          role: "assistant",
          content: L3annotation
        }
      ];
      config[e].chatList = chatList;
      config[e].level = 'L1';
      config[e].open = false;
      config[e].fsource = "chart";
      config[e].reason = activeFallacyCase.text_chart_linkage.annotations[e].reason;
      config[e].range = activeFallacyCase.text_chart_linkage.annotations[e].range;
      setFallacyChatList(config);
    });

  },[selectedCase]);

  useEffect(()=>{
    initConfig();
    setImageFlag(false);
  },[selectedCase]);

  //console.log(caseArticle.cases.map(e=>e.title));

  return (
    <div className="App">
      <Layout className="mainContainer">
      <Header style={{height: 40}}>
        <NavBar
          caselist={caseArticle.cases.map((e, i)=>{
            return {
              value: i,
              label: e.title
            };
          })}
          setSelectedCase={setSelectedCase}
          activeArticle={caseArticle.cases[selectedCase]}
        />
      </Header>
      <Content className='vastContainer' style={newStyle}>
        <Row>
          <Col span={20} offset={4}>
            <NewsContent 
              selectedCase={selectedCase}
              newscase={activeArticle}
              activeFallacyCase={activeFallacyCase}
              errSentence={errSentence}
              setErrSentence={setErrSentence}
              fallacyChatList={fallacyChatList}
              setFallacyChatList={setFallacyChatList}
              imageFlag={imageFlag}
              setImageFlag={setImageFlag}
            />
          </Col>
        </Row>
      </Content>
     </Layout>
     <Spin tip="Detecting Fallacies..." spinning={(imageFlag || selectedCase === 2) ? false : true} fullscreen />
    </div>
  );
}

export default App;
