import { useEffect, useCallback, useState, useRef } from "react";
import { Typography, Image, Tag, Space, Row, Col, Spin  } from "antd";
import { createWorker } from "tesseract.js";
import useDynamicRefs from "use-dynamic-refs";
import { cx, css } from "@emotion/css";

import { Sentence } from "./sentence";
import { FallacyTag } from "./tag";
import { FallacyImage } from "./image";
import { Linkage } from "./d3linkage";
import merge from "../../utilities";

export function NewsContent ({selectedCase, newscase, activeFallacyCase, errSentence, 
    setErrSentence, fallacyChatList, setFallacyChatList, imageFlag, setImageFlag}) {
    const [getRef, setRef] =  useDynamicRefs();
    //const [scrollPosition, setScrollPosition] = useState(0);
    const [imgOcr, setImgOcr] = useState(null);
    const [clickSentence, setClickSentence] = useState({
        p_index: null,
        fallacy: null
    });
    const [sidebarWidth, setSidebarWidth] = useState(630);
    const [paragraphNodes, setParagraphNodes] = useState([]);
    const [fallacyNodes, setFallacyNodes] = useState([]);
    //const [fposFlag, setFposFlag] = useState(false);
    const [offsetYfnode, setOffsetYfnode] = useState(0);
    const [linkage, setLinkage] = useState([]);
    
    const { Title, Paragraph, Text } = Typography;

    /** preprocessing fallacies by sentence */
    const sentenceProcess = useCallback(()=>{
        let sentenceList = [];
        //let fallacyChatList_temp = [];
        newscase.content.forEach((e,i)=>{
            const sublist = e.text.replace(/([.?!(.\))])\s*(?=[A-Z])/g, "$1|").split("|");
            sublist.forEach((ee,ii)=>{
                const sentenceDict_ = {
                    sentence: ee,
                    paragraph: i,
                    fallacy: [],
                    textSource: [],
                    chartSource: []
                }; 
                sentenceList.push(sentenceDict_);
            });
        });
        
        //get fallacy from case for each sentence
        sentenceList.map((e,i)=>{
            const index = i+1;
            const fallacyTypeList = [];
            const textSource = [];
            const chartSource = [];
            // fallacy list from text fallacies
            Object.keys(activeFallacyCase.fallacies.sentences).forEach(key=>{
                if(activeFallacyCase.fallacies.sentences[key].includes(index)){
                    fallacyTypeList.push(key);
                    textSource.push(key);
                }
            });
            // chart fallacies
            if(activeFallacyCase.text_chart_linkage !== null){
                Object.keys(activeFallacyCase.text_chart_linkage.sentences).forEach(key=>{
                    if(activeFallacyCase.text_chart_linkage.sentences[key].includes(index)){
                        fallacyTypeList.push(key);
                        chartSource.push(key);
                    }
                });
                e.chartSource = chartSource;
            }
            e.fallacy = fallacyTypeList;
            e.index = i;
            e.textSource = textSource;
        });
        setErrSentence(sentenceList);
    },[selectedCase]);

    // OCR the chart image
    const getOcr = useCallback(()=>{
        const imgSrc = selectedCase===0 ? process.env.PUBLIC_URL+'/img/case1.png' : process.env.PUBLIC_URL+'/img/case2.png';
        //console.log(imgSrc);
        (async () => {
            const worker = await createWorker('eng');
            const ret = await worker.recognize(imgSrc);
            console.log("getting OCR...");
            const regexp = /[A-Za-z0-9]/g;
            const filteredList = ret.data.words.filter(e=>{
                const t = e.text;
                //console.log(e.text, e.text.match(regexp));
                return e.text.match(regexp) !== null;
            });
            //console.log(filteredList);
            //console.log(selectedCase);
            setImgOcr(filteredList);
            setImageFlag(true);
            await worker.terminate();
        })()
    },[selectedCase]);

    //generate fallacy nodes
    const createParagraphNodes = useCallback(()=>{
        const pnodeList = [];
        const fnodeList = [];
        console.log("errSentence", errSentence);
        newscase.content.forEach((e,i)=>{
            const pid = getRef('paragraph-'+i);
            const windowPosition = window.scrollY;
            const nodePosition = pid.current.getBoundingClientRect().top;
            
            const pnode = {
                id: "pnode_"+i, 
                fallacy: [], 
                x: 1, //change x-position accordingly 
                y: nodePosition+windowPosition
            };
            const imgnode = {
                id: "imgnode_"+i, 
                fallacy: [], 
                x: 1, //change x-position accordingly 
                y: null
            };
            errSentence.forEach(ee=>{
                if(ee.paragraph === i){
                    // paragraph node
                    if(ee.fallacy.length>0){
                        pnode.fallacy = merge(pnode.fallacy, ee.fallacy);
                        ee.fallacy.forEach(eee=>{
                            !fnodeList.includes(eee) && fnodeList.push(eee);
                        });
                    }
                    if(ee.chartSource.length>0){
                        const imageID = getRef('fallacy-image');
                        const imagePosition = imageID.current.getBoundingClientRect().top;
                        imgnode.fallacy = merge(imgnode.fallacy, ee.chartSource);
                        imgnode.y = imagePosition+windowPosition+150
                    }
                }
            });
            pnode.fallacy.length>0 && pnodeList.push(pnode);
            imgnode.fallacy.length>0 && pnodeList.push(imgnode);
        });
        console.log("pnode", pnodeList);
        // generate fallacy tags and nodes
        const newfnodeList = createFallacyNodes(fnodeList);
        const linklist = createLinkage(pnodeList, newfnodeList);
        setParagraphNodes(pnodeList);
        setFallacyNodes(newfnodeList);
        setLinkage(linklist);
    },[errSentence]);

    const createLinkage = (pnodeList, fnodeList) => {
        const linkList = [];
        pnodeList.forEach((p,i)=>{
            fnodeList.forEach((f,j)=>{
                if(p.fallacy.includes(f.fallacy)){
                    const linkObj = {
                        from: f.id,
                        to: p.id,
                        fallacy: f.fallacy,
                        link:{
                            source: [f.x, f.y],
                            target: [p.x, p.y]
                        }
                    };
                    linkList.push(linkObj);
                }
            });
        });
        return(linkList);
    };

    const createFallacyNodes = (fnodeList)=> {
        /** CAREFUL! The text fallacies cannot be the same with image fallacies now!!! */
        const text_fallacies = activeFallacyCase.fallacies.logical_fallacies;
        const chart_fallacies = activeFallacyCase.text_chart_linkage !== null ? activeFallacyCase.text_chart_linkage.fallacies : [];
        const linkContainerRef = getRef('linkageContainer').current.getBoundingClientRect();
        const id1 = getRef('paragraph-0').current.getBoundingClientRect();
        const offsetX = linkContainerRef.right - id1.right;
        const fallacyContainer = getRef("fallacyContainer").current.getBoundingClientRect();
        const offsetY_ = fallacyContainer.top - linkContainerRef.top;
        //console.log(linkContainerRef.top, fallacyContainer.top)
        const marginV = 50;
        const domheight = 22;
        //console.log("fallacyContainer", fallacyContainer);
        const newfnodeList = fnodeList.map((e,i)=>{
            const type = [];
            text_fallacies.includes(e) && type.push("text");
            chart_fallacies.includes(e) && type.push("chart");
            const fnode = {
                id: "fnode_"+e,
                fallacy: e,
                type: type,
                top: (marginV+domheight)*i+8,
                x: offsetX-10,//offset-10, //change x-position accordingly 
                y: offsetY_ + (marginV+domheight+22.7)*i + 8 //top position
            }; 
            return fnode;
        });
        //console.log("newfnodeList", newfnodeList);
        return(newfnodeList);
    };

    const handleScroll = () => {
        const position = window.scrollY;
        //const linkContainerRef = getRef('linkageContainer').current.getBoundingClientRect();
        //const fallacyContainer = getRef("fallacyContainer").current.getBoundingClientRect();
        //const offsetY_ = fallacyContainer.top - linkContainerRef.top;
        //console.log("offsetY_", offsetY_);
        setOffsetYfnode(position);
    };

    useEffect(()=>{
        sentenceProcess();
        selectedCase!== 2 && getOcr();
    }, [selectedCase]);

    useEffect(() => {
        // Get ref for specific ID 
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
      }, [selectedCase]);

    useEffect(()=>{
        createParagraphNodes();
        //createFallacyNodes();
    },[errSentence]);

    return(
        <Typography>
            <Row>
                {/** Article content */}
                <Col span={12} style={{
                            minHeight: 800
                        }}>
                    <Row>
                        <Col span={24}><Title id="title" key="title">{newscase.title}</Title></Col>
                        {/*<Col span={24}><blockquote id="subtitle" key="subtitle">{newscase["sub-title"]}</blockquote></Col>*/}
                        {newscase.content.map((p,i)=> //paragraph DOM
                        <Row key={"sentenceRow"+i}>
                        <Col key={"sentenceCol"+i} span={24}>
                            <Paragraph
                                ref={setRef('paragraph-'+i)} 
                                id={"news-content-"+i} 
                                key={"news-content-"+i} 
                            >
                                <Sentence 
                                    errSentence={errSentence.filter(fe=>fe.paragraph === i)}
                                    setErrSentence={setErrSentence}
                                    fallacyChatList={fallacyChatList}
                                    setFallacyChatList={setFallacyChatList}
                                    paragraphID={i}
                                    setClickSentence={setClickSentence}
                                />
                            </Paragraph>
                        </Col>
                        {/*<Col key={"tagCol"+i} span={10}>
                            <FallacyTag 
                                errSentence={errSentence.filter(fe=>fe.paragraph === i)}
                                paragraphID={i}
                                fallacyChatList={fallacyChatList}
                                setFallacyChatList={setFallacyChatList}
                                clickSentence={clickSentence}
                                setClickSentence={setClickSentence}
                            />
                        </Col>*/}
                        
                        {p.hasImage && 
                        <div ref={setRef('fallacy-image')}>
                        <FallacyImage
                            errSentence={errSentence}
                            paragraphID={i}
                            fallacyChatList={fallacyChatList}
                            setFallacyChatList={setFallacyChatList}
                            clickSentence={clickSentence}
                            setClickSentence={setClickSentence}
                            imgSrc={process.env.PUBLIC_URL+p.ImageURL}
                            imgOcr={imgOcr}
                            imageFlag={imageFlag}
                        />
                        </div>}
                        </Row>
                    )}
                    </Row>
                </Col>
                {/** Tags and svg linkages */}
                <Col span={12}>
                    <div
                        ref={setRef('linkageContainer')} 
                        className={cx(css`
                            width: calc(100% - ${sidebarWidth}px);
                            /*background-color: lightgrey;*/
                            height: 100%;
                        `)}
                    >
                        <Linkage
                            paragraphNodes={paragraphNodes}
                            fallacyNodes={fallacyNodes}
                            offsetYfnode={offsetYfnode}
                            linkage={linkage}
                            fallacyChatList={fallacyChatList}
                        />
                    </div>
                <div style={{
                    //display: "flex",
                    width: 630,
                    //height: 100,
                    //boxShadow: "0px 0px 5px 2px #1677FF, 0px 0px 0px 2px rgba(255, 255, 255, 0.19) inset",
                    alignItems: "left",
                    //border: "1px solid",
                    //justifyContent: "right",
                    position: "fixed",
                    top: 170, //170
                    bottom: 50,
                    right: 20,
                }}>
                    <div
                        ref={setRef("fallacyContainer")}
                        style={{
                            paddingTop: 10,
                            //backgroundColor: "green",
                            width: "100%"
                        }}
                    >
                    <FallacyTag
                        fallacyChatList={fallacyChatList}
                        setFallacyChatList={setFallacyChatList}
                        clickSentence={clickSentence}
                        setClickSentence={setClickSentence}
                        fallacyNodes={fallacyNodes}
                        newscase={newscase}
                    />
                    </div>
                </div>
                </Col>
            </Row>
                
        </Typography>
    );
}