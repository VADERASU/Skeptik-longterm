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
    setErrSentence, fallacyChatList, setFallacyChatList, imageFlag, setImageFlag, hideAnnotations}) {
    const [getRef, setRef] =  useDynamicRefs();
    //const [scrollPosition, setScrollPosition] = useState(0);
    const [imgOcr, setImgOcr] = useState(null);
    const [clickSentence, setClickSentence] = useState({
        p_index: null,
        fallacy: null
    });
    const [sidebarWidth, setSidebarWidth] = useState(Math.min(630, window.innerWidth * 0.35));
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [paragraphNodes, setParagraphNodes] = useState([]);
    const [fallacyNodes, setFallacyNodes] = useState([]);
    //const [fposFlag, setFposFlag] = useState(false);
    const [offsetYfnode, setOffsetYfnode] = useState(0);
    const [linkage, setLinkage] = useState([]);
    const [authorOpen, setAuthorOpen] = useState(false);

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
        // Skip if sidebar is not shown (refs won't exist)
        if (windowWidth < 900) return;

        const pnodeList = [];
        const fnodeList = [];
        console.log("errSentence", errSentence);
        // Get all chart fallacies from text_chart_linkage (if exists)
        const chartFallacies = activeFallacyCase?.text_chart_linkage?.fallacies || [];

        newscase.content.forEach((e,i)=>{
            const pid = getRef('paragraph-'+i);
            if (!pid || !pid.current) return;
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
                }
            });

            // For paragraphs with images, link to ALL chart fallacies
            if (e.hasImage && chartFallacies.length > 0) {
                const imageID = getRef('fallacy-image-'+i);
                if (imageID?.current) {
                    const imagePosition = imageID.current.getBoundingClientRect().top;
                    imgnode.fallacy = [...chartFallacies];
                    imgnode.y = imagePosition + windowPosition + 150;
                }
            }

            pnode.fallacy.length>0 && pnodeList.push(pnode);
            imgnode.fallacy.length>0 && pnodeList.push(imgnode);
        });
        console.log("pnode", pnodeList);
        // generate fallacy tags and nodes from instance-based fallacyChatList
        const newfnodeList = createFallacyNodes();
        const linklist = createLinkage(pnodeList, newfnodeList);
        setParagraphNodes(pnodeList);
        setFallacyNodes(newfnodeList);
        setLinkage(linklist);
    },[errSentence, windowWidth, fallacyChatList, activeFallacyCase, newscase]);

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

    const createFallacyNodes = ()=> {
        // Guard for refs when sidebar is hidden
        const linkageContainerRefObj = getRef('linkageContainer');
        const paragraphRefObj = getRef('paragraph-0');
        if (!linkageContainerRefObj?.current || !paragraphRefObj?.current) {
            return [];
        }

        const linkContainerRef = linkageContainerRefObj.current.getBoundingClientRect();
        const id1 = paragraphRefObj.current.getBoundingClientRect();
        const offsetX = linkContainerRef.right - id1.right;
        const fallacyContainerRef = getRef("fallacyContainer");
        if (!fallacyContainerRef?.current) return [];
        const fallacyContainer = fallacyContainerRef.current.getBoundingClientRect();

        // Create nodes from fallacyChatList (which now has instance-based keys like "BBS_0", "BBS_1")
        const newfnodeList = [];
        let nodeIndex = 0;

        Object.keys(fallacyChatList).forEach(instanceKey => {
            const instance = fallacyChatList[instanceKey];
            if (!instance || !instance.sentences) return;

            const fallacyCode = instance.fallacyCode;
            const sentences = instance.sentences;
            const isChart = instance.fsource === "chart";

            // Find the first sentence element for this instance
            let sentenceY = 0;
            let absoluteY = 0;

            if (isChart) {
                // Chart fallacy - create one tag per image
                // Find all image refs and create a fnode for each
                for (let imgIdx = 0; imgIdx < newscase.content.length; imgIdx++) {
                    if (!newscase.content[imgIdx].hasImage) continue;

                    const fallacyImageRef = getRef('fallacy-image-' + imgIdx);
                    if (fallacyImageRef?.current) {
                        const imageRect = fallacyImageRef.current.getBoundingClientRect();
                        const imgSentenceY = imageRect.top - fallacyContainer.top;
                        const imgAbsoluteY = imageRect.top + window.scrollY;

                        const fnode = {
                            id: "fnode_" + instanceKey + "_img" + imgIdx,
                            instanceKey: instanceKey,  // Same instanceKey for all (e.g., "DIS_chart")
                            fallacy: fallacyCode,
                            type: ["chart"],
                            top: imgSentenceY,
                            x: offsetX - 10,
                            y: imgAbsoluteY,
                            sentences: sentences,
                            imageIndex: imgIdx
                        };
                        newfnodeList.push(fnode);
                        nodeIndex++;
                    }
                }
                // Skip the normal fnode creation below for chart fallacies
                return;
            } else if (sentences.length > 0) {
                // Text fallacy - find sentence element by its index
                const firstSentenceIndex = sentences[0];
                // Search for elements with matching sentence index in data attributes
                const allSentences = document.querySelectorAll(`[data-sentence-index]`);
                let sentenceEl = null;
                allSentences.forEach(el => {
                    if (parseInt(el.dataset.sentenceIndex) === firstSentenceIndex - 1) {
                        sentenceEl = el;
                    }
                });

                if (sentenceEl) {
                    const sentenceRect = sentenceEl.getBoundingClientRect();
                    sentenceY = sentenceRect.top - fallacyContainer.top;
                    absoluteY = sentenceRect.top + window.scrollY;
                } else {
                    // Fallback: use fallacy code to find any matching element
                    const fallbackEl = document.querySelector(`[data-fallacy*="${fallacyCode}"]`);
                    if (fallbackEl) {
                        const sentenceRect = fallbackEl.getBoundingClientRect();
                        sentenceY = sentenceRect.top - fallacyContainer.top;
                        absoluteY = sentenceRect.top + window.scrollY;
                    } else {
                        sentenceY = 70 * nodeIndex + 8;
                        absoluteY = fallacyContainer.top + sentenceY + window.scrollY;
                    }
                }
            } else {
                // No sentences - use stacked position
                sentenceY = 70 * nodeIndex + 8;
                absoluteY = fallacyContainer.top + sentenceY + window.scrollY;
            }

            const fnode = {
                id: "fnode_" + instanceKey,
                instanceKey: instanceKey,  // e.g., "BBS_0", "BBS_1"
                fallacy: fallacyCode,       // Original code for styling
                type: isChart ? ["chart"] : ["text"],
                top: sentenceY,
                x: offsetX - 10,
                y: absoluteY,
                sentences: sentences
            };
            newfnodeList.push(fnode);
            nodeIndex++;
        });

        // Sort by Y position so tags appear in reading order
        newfnodeList.sort((a, b) => a.top - b.top);

        // Add minimum spacing between tags to prevent overlap
        const MIN_TAG_SPACING = 35; // Minimum pixels between tags
        for (let i = 1; i < newfnodeList.length; i++) {
            const prevTag = newfnodeList[i - 1];
            const currTag = newfnodeList[i];
            if (currTag.top - prevTag.top < MIN_TAG_SPACING) {
                currTag.top = prevTag.top + MIN_TAG_SPACING;
            }
        }

        return newfnodeList;
    };

    const handleScroll = () => {
        const position = window.scrollY;
        //const linkContainerRef = getRef('linkageContainer').current.getBoundingClientRect();
        //const fallacyContainer = getRef("fallacyContainer").current.getBoundingClientRect();
        //const offsetY_ = fallacyContainer.top - linkContainerRef.top;
        //console.log("offsetY_", offsetY_);
        setOffsetYfnode(position);
    };

    // Handle author byline click
    const handleAuthorClick = useCallback(() => {
        setAuthorOpen(prev => !prev);
        // Close all other fallacy tags
        const updatedList = {};
        Object.keys(fallacyChatList).forEach(key => {
            updatedList[key] = { ...fallacyChatList[key], open: false };
        });
        setFallacyChatList(updatedList);
    }, [fallacyChatList, setFallacyChatList]);

    useEffect(()=>{
        sentenceProcess();
        selectedCase!== 2 && getOcr();
        // Close author info when switching cases
        setAuthorOpen(false);
    }, [selectedCase]);

    // Close author info when any fallacy tag is opened
    useEffect(() => {
        const anyFallacyOpen = Object.values(fallacyChatList).some(f => f.open);
        if (anyFallacyOpen) {
            setAuthorOpen(false);
        }
    }, [fallacyChatList]);

    useEffect(() => {
        // Get ref for specific ID
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
      }, [selectedCase]);

    // Handle window resize for responsive layout
    useEffect(() => {
        const handleResize = () => {
            const newWidth = window.innerWidth;
            setWindowWidth(newWidth);
            // Calculate sidebar width: use 35% of window or max 630px, min 300px
            const calculatedWidth = Math.max(300, Math.min(630, newWidth * 0.35));
            setSidebarWidth(calculatedWidth);
        };

        window.addEventListener('resize', handleResize);
        // Call once on mount to set initial values
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(()=>{
        // Use requestAnimationFrame to ensure DOM is updated before calculating positions
        const rafId = requestAnimationFrame(() => {
            createParagraphNodes();
        });
        return () => cancelAnimationFrame(rafId);
    },[errSentence, windowWidth, imageFlag, fallacyChatList, activeFallacyCase]);

    // Calculate responsive column spans
    const articleSpan = windowWidth < 1200 ? (windowWidth < 900 ? 24 : 16) : 12;
    const sidebarSpan = windowWidth < 1200 ? (windowWidth < 900 ? 0 : 8) : 12;
    const showSidebar = windowWidth >= 900 && !hideAnnotations;

    return(
        <Typography>
            <Row>
                {/** Article content */}
                <Col span={articleSpan} style={{
                            minHeight: 800
                        }}>
                    <Row>
                        <Col span={24}><Title id="title" key="title">{newscase.title}</Title></Col>
                        {newscase.author && (
                            <Col span={24} style={{ marginTop: -10, marginBottom: 20 }}>
                                <Space size="small">
                                    <Text
                                        style={{
                                            fontSize: '14px',
                                            fontStyle: 'italic',
                                            color: '#666',
                                            cursor: hideAnnotations ? 'default' : 'pointer',
                                            padding: hideAnnotations ? '0' : '2px 6px',
                                            borderRadius: '3px',
                                            backgroundColor: hideAnnotations ? 'transparent' : 'rgb(31 120 180 / 0.1)',
                                            border: hideAnnotations ? 'none' : '1px solid rgb(31 120 180 / 0.6)',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onClick={hideAnnotations ? undefined : handleAuthorClick}
                                        onMouseEnter={(e) => {
                                            if (!hideAnnotations) {
                                                e.target.style.backgroundColor = 'rgb(31 120 180 / 0.2)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!hideAnnotations) {
                                                e.target.style.backgroundColor = 'rgb(31 120 180 / 0.1)';
                                            }
                                        }}
                                    >
                                        by {newscase.author}
                                    </Text>
                                    {!hideAnnotations && (
                                        <Tag
                                            icon={<Text style={{ marginRight: 4 }}>+</Text>}
                                            color="blue"
                                            style={{
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                padding: '2px 8px',
                                                borderRadius: '4px'
                                            }}
                                            onClick={handleAuthorClick}
                                        >
                                            About the author
                                        </Tag>
                                    )}
                                </Space>
                                {authorOpen && activeFallacyCase.author_info && (
                                    <div style={{
                                        marginTop: 16,
                                        padding: '16px',
                                        backgroundColor: 'white',
                                        border: '2px solid rgb(31 120 180 / 0.6)',
                                        borderRadius: '8px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    }}>
                                        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                                            <Text strong style={{ color: '#1f78b4', fontSize: '16px' }}>
                                                About the Author
                                            </Text>
                                            <Text
                                                style={{
                                                    cursor: 'pointer',
                                                    color: '#666',
                                                    fontSize: '20px',
                                                    fontWeight: 'bold',
                                                    lineHeight: '1'
                                                }}
                                                onClick={() => setAuthorOpen(false)}
                                            >
                                                ×
                                            </Text>
                                        </Row>
                                        <Paragraph style={{
                                            marginBottom: 0,
                                            fontSize: '14px',
                                            lineHeight: '1.6',
                                            whiteSpace: 'pre-line'
                                        }}>
                                            {activeFallacyCase.author_info.explanation}
                                        </Paragraph>
                                    </div>
                                )}
                            </Col>
                        )}
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
                                    hideAnnotations={hideAnnotations}
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
                        <Col span={24}>
                        <div ref={setRef('fallacy-image-'+i)} style={{width: '100%', marginBottom: 20}}>
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
                            hideAnnotations={hideAnnotations}
                        />
                        </div>
                        </Col>}
                        </Row>
                    )}
                    </Row>
                </Col>
                {/** Tags and svg linkages */}
                {showSidebar && <Col span={sidebarSpan}>
                    <div
                        ref={setRef('linkageContainer')}
                        style={{
                            position: 'relative',
                            width: '100%',
                            minHeight: 800,
                        }}
                    >
                        {/* SVG for connector lines - positioned behind tags */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                            <Linkage
                                paragraphNodes={paragraphNodes}
                                fallacyNodes={fallacyNodes}
                                offsetYfnode={offsetYfnode}
                                linkage={linkage}
                                fallacyChatList={fallacyChatList}
                            />
                        </div>
                        {/* Tags - positioned on top */}
                        <div
                            ref={setRef("fallacyContainer")}
                            style={{
                                position: 'relative',
                                width: "100%",
                                paddingLeft: 20,
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
                </Col>}
            </Row>
                
        </Typography>
    );
}