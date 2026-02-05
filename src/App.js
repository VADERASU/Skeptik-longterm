import { useState, useEffect, useCallback } from "react";
import {Layout, Col, Row, Spin} from 'antd';
import 'antd/dist/reset.css';
import './styles/App.css';
//import axios from 'axios';

/** React components */
import { NavBar } from "./components/nav";
import { NewsContent } from "./components/content";
import { ArticleGazeTracker, getReadingMetrics } from "./components/gaze";

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
  const [gazeEnabled, setGazeEnabled] = useState(true);
  const [gazeMetrics, setGazeMetrics] = useState(null);

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
      // Skip if fallacy type doesn't exist in config
      if (!config[e]) {
        console.warn(`Fallacy type "${e}" not found in config, skipping`);
        return;
      }
      const annotations = activeFallacyCase.fallacies.annotations[e];
      if (!annotations) return;

      /** !!! THIS PART NEED TO BE UPDATED AFTER PROMPT UPDATEING !!! */
      const L1Link = annotations.L1?.[0]?.link || "";
      const L2Link = annotations.L2?.[0]?.link || "";
      const L3Link = annotations.L3?.[0]?.link || "";
      const chatList = [
        {
          role: "assistant",
          content: annotations.L1?.[0]?.explanation || "",
          link: L1Link
        },{
          role: "assistant",
          content: annotations.L2?.[0]?.explanation || "",
          link: L2Link
        },{
          role: "assistant",
          content: annotations.L3?.[0]?.explanation || "",
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
      // Skip if fallacy type doesn't exist in config
      if (!config[e]) {
        console.warn(`Fallacy type "${e}" not found in config, skipping`);
        return;
      }
      const annotations = activeFallacyCase.text_chart_linkage.annotations[e];
      if (!annotations) return;

      const L1annotation = annotations.L1;
      const L2annotation = annotations.L2;
      const L3annotation = annotations.L3;
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
      config[e].reason = annotations.reason;
      config[e].range = annotations.range;
      setFallacyChatList(config);
    });

  },[selectedCase]);

  useEffect(()=>{
    initConfig();
    setImageFlag(false);
  },[selectedCase]);

  // Gaze tracking callbacks
  const handleSentenceGaze = useCallback((data) => {
    console.log('Looking at sentence:', data.sentenceIndex, 'in paragraph:', data.paragraphIndex);
  }, []);

  const handleParagraphGaze = useCallback((data) => {
    console.log('Looking at paragraph:', data.paragraphIndex);
  }, []);

  const handleFallacyGaze = useCallback((data) => {
    console.log('Looking at fallacy:', data.fallacyType);
  }, []);

  const handleGazeMetrics = useCallback((metrics) => {
    setGazeMetrics(metrics);
    // Log reading metrics every 10 seconds
    if (metrics.gazeSequence.length % 600 === 0) {
      const summary = getReadingMetrics(metrics);
      console.log('Reading metrics:', summary);
    }
  }, []);

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
        <ArticleGazeTracker
          enabled={gazeEnabled}
          showOverlay={true}
          onSentenceGaze={handleSentenceGaze}
          onParagraphGaze={handleParagraphGaze}
          onFallacyGaze={handleFallacyGaze}
          onGazeMetrics={handleGazeMetrics}
        >
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
        </ArticleGazeTracker>
      </Content>
     </Layout>
     <Spin tip="Detecting Fallacies..." spinning={(imageFlag || selectedCase === 2) ? false : true} fullscreen />
    </div>
  );
}

export default App;
