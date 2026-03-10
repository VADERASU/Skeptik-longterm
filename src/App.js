import { useState, useEffect, useCallback } from "react";
import {Layout, Col, Row, Spin} from 'antd';
import 'antd/dist/reset.css';
import './styles/App.css';
//import axios from 'axios';

/** React components */
import { NavBar } from "./components/nav";
import { NewsContent } from "./components/content";
import { ArticleGazeTracker, getReadingMetrics } from "./components/gaze";
import { SplashScreen } from "./components/SplashScreen";
import { StudyDataExporter } from "./components/StudyDataExporter";

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
  const [splashComplete, setSplashComplete] = useState(false);
  const [showGazeOverlay, setShowGazeOverlay] = useState(false);
  const [hideAnnotations, setHideAnnotations] = useState(false);

  // Read settings from URL parameters (set by batch file)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('control') === 'true') {
      setHideAnnotations(true);
    }
    if (params.get('overlay') === 'true') {
      setShowGazeOverlay(true);
    }
  }, []);

  const { Header, Content } = Layout;
  const activeArticle = caseArticle.cases[selectedCase];
  const activeFallacyCase = caseList[version][selectedCase];


  const newStyle = {
    backgroundColor: '#fff',
    padding: 20
  };

  // Helper to check if two sentence arrays are consecutive
  const areConsecutive = (sentences1, sentences2) => {
    if (!sentences1?.length || !sentences2?.length) return false;
    const max1 = Math.max(...sentences1);
    const min2 = Math.min(...sentences2);
    return max1 + 1 === min2;
  };

  // Merge consecutive instances in annotations
  const mergeConsecutiveInstances = (annotations) => {
    if (!annotations?.L1?.length) return annotations;

    const merged = { L1: [], L2: [], L3: [] };
    const instances = [...annotations.L1].sort((a, b) =>
      Math.min(...(a.sentence || [999])) - Math.min(...(b.sentence || [999]))
    );

    let i = 0;
    while (i < instances.length) {
      let currentSentences = [...(instances[i].sentence || [])];
      let currentL1 = instances[i].explanation || "";
      let currentL2 = annotations.L2?.[i]?.explanation || "";
      let currentL3 = annotations.L3?.[i]?.explanation || "";
      let currentLink = instances[i].link || "";

      // Look ahead and merge consecutive
      let j = i + 1;
      while (j < instances.length && areConsecutive(currentSentences, instances[j].sentence)) {
        currentSentences = [...currentSentences, ...(instances[j].sentence || [])];
        // Append explanations
        const nextL1 = instances[j].explanation || "";
        const nextL2 = annotations.L2?.[j]?.explanation || "";
        const nextL3 = annotations.L3?.[j]?.explanation || "";
        if (nextL1) currentL1 += " " + nextL1;
        if (nextL2) currentL2 += " " + nextL2;
        if (nextL3) currentL3 += " " + nextL3;
        j++;
      }

      merged.L1.push({ explanation: currentL1, sentence: currentSentences.sort((a,b) => a-b), link: currentLink });
      merged.L2.push({ explanation: currentL2, sentence: currentSentences.sort((a,b) => a-b) });
      merged.L3.push({ explanation: currentL3, sentence: currentSentences.sort((a,b) => a-b) });
      i = j;
    }

    return merged;
  };

  const initConfig = useCallback(()=>{
    const baseConfig = JSON.parse(JSON.stringify(fallacyList.FallacyType));
    const config = {};

    // Create instance-based config entries (e.g., "BBS_0", "BBS_1" for multiple instances)
    activeFallacyCase.fallacies.logical_fallacies.forEach(fallacyCode => {
      // Skip if fallacy type doesn't exist in base config
      if (!baseConfig[fallacyCode]) {
        console.warn(`Fallacy type "${fallacyCode}" not found in config, skipping`);
        return;
      }
      const rawAnnotations = activeFallacyCase.fallacies.annotations[fallacyCode];
      if (!rawAnnotations) return;

      // Merge consecutive instances automatically
      const annotations = mergeConsecutiveInstances(rawAnnotations);

      // Get the number of instances (from L1 array length)
      const numInstances = annotations.L1?.length || 1;

      // Create a config entry for each instance
      for (let i = 0; i < numInstances; i++) {
        const instanceKey = `${fallacyCode}_${i}`;
        const L1Link = annotations.L1?.[i]?.link || "";
        const L2Link = annotations.L2?.[i]?.link || "";
        const L3Link = annotations.L3?.[i]?.link || "";
        const sentences = annotations.L1?.[i]?.sentence || [];

        const chatList = [
          {
            role: "assistant",
            content: annotations.L1?.[i]?.explanation || "",
            link: L1Link
          },{
            role: "assistant",
            content: annotations.L2?.[i]?.explanation || "",
            link: L2Link
          },{
            role: "assistant",
            content: annotations.L3?.[i]?.explanation || "",
            link: L3Link
          }
        ];

        config[instanceKey] = {
          ...baseConfig[fallacyCode],
          chatList: chatList,
          level: 'L1',
          open: false,
          fsource: "text",
          fallacyCode: fallacyCode,  // Original code for styling
          instanceIndex: i,
          sentences: sentences  // Which sentences this instance covers
        };
      }
    });

    setFallacyChatList(config);

    // Handle chart fallacies
    if (activeFallacyCase.text_chart_linkage !== null) {
      activeFallacyCase.text_chart_linkage.fallacies.forEach(fallacyCode => {
        if (!baseConfig[fallacyCode]) {
          console.warn(`Fallacy type "${fallacyCode}" not found in config, skipping`);
          return;
        }
        const annotations = activeFallacyCase.text_chart_linkage.annotations[fallacyCode];
        if (!annotations) return;

        // Get sentences for this chart fallacy
        const chartSentences = activeFallacyCase.text_chart_linkage.sentences?.[fallacyCode] || [];

        // Chart fallacies use a different structure (not arrays)
        const instanceKey = `${fallacyCode}_chart`;
        const chatList = [
          { role: "assistant", content: annotations.L1 || "" },
          { role: "assistant", content: annotations.L2 || "" },
          { role: "assistant", content: annotations.L3 || "" }
        ];

        config[instanceKey] = {
          ...baseConfig[fallacyCode],
          chatList: chatList,
          level: 'L1',
          open: false,
          fsource: "chart",
          fallacyCode: fallacyCode,
          instanceIndex: 'chart',
          reason: annotations.reason,
          range: annotations.range,
          sentences: chartSentences
        };
      });
    }

    setFallacyChatList(config);
  },[selectedCase]);

  useEffect(()=>{
    initConfig();
    // Set imageFlag true if case has text_chart_linkage (for image highlighting)
    // Otherwise set false and let OCR set it later
    if (activeFallacyCase?.text_chart_linkage !== null) {
      setImageFlag(true);
    } else {
      setImageFlag(false);
    }
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

  if (!splashComplete) {
    return (
      <div className="App">
        <SplashScreen onComplete={() => setSplashComplete(true)} />
      </div>
    );
  }

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
          showOverlay={showGazeOverlay}
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
                hideAnnotations={hideAnnotations}
              />
            </Col>
          </Row>
        </ArticleGazeTracker>
      </Content>
     </Layout>
     <Spin tip="Detecting Fallacies..." spinning={(imageFlag || selectedCase === 2) ? false : true} fullscreen />
     <StudyDataExporter
       gazeMetrics={gazeMetrics}
       articleInfo={{
         title: activeArticle?.title,
         source: activeFallacyCase?.source
       }}
       fallacyChatList={fallacyChatList}
       enabled={splashComplete}
       onExportComplete={() => setSplashComplete(false)}
     />
    </div>
  );
}

export default App;
