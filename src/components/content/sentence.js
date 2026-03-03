import { useEffect, useCallback, useState, useRef } from "react";
import { Typography, Popover, Segmented, Flex, 
    Tooltip, Space, Button, Tag, Divider, List, Avatar } from "antd";
import {
    RedoOutlined,
    PushpinOutlined,
    MessageOutlined,
    UserOutlined,
    OpenAIOutlined
  } from '@ant-design/icons';
import * as Selection from 'selection-popover';
import { cx, css } from "@emotion/css";

export function Sentence({errSentence, setErrSentence, fallacyChatList, setFallacyChatList,
paragraphID, setClickSentence, hideAnnotations}){
    const { Text } = Typography;

    // If hideAnnotations is true, render all sentences as plain text
    if (hideAnnotations) {
        return (
            <>
            {errSentence.map((s, i) => (
                <Text
                    id={i + "-news-sentence-" + paragraphID}
                    key={i + "-news-sentence-" + paragraphID}
                >{s.sentence} </Text>
            ))}
            </>
        );
    }

    // Helper to find instance data for a fallacy code (e.g., "BBS" -> "BBS_0" instance data)
    const getFallacyInstance = (fallacyCode) => {
        // Find the first instance that matches this fallacy code
        for (const key of Object.keys(fallacyChatList)) {
            if (fallacyChatList[key]?.fallacyCode === fallacyCode) {
                return fallacyChatList[key];
            }
        }
        return null;
    };

    const handleSentenceClick = (pid, fallacy, sentenceIndex) => {
        //console.log(pid, fallacy, sentenceIndex);
        setClickSentence({
            p_index: pid,
            fallacy: fallacy,
            sentenceIndex: sentenceIndex + 1  // Convert to 1-based index to match JSON data
        });
    };

    return(
        <>
        {errSentence.map((s,i)=>{
            if(s.fallacy.length === 0){ // no error
                return(
                    <Text 
                        id={i+"-news-sentence-"+paragraphID} 
                        key={i+"-news-sentence-"+paragraphID}
                    >{s.sentence} </Text>
                );
            }else if(s.fallacy.length === 1){
                const fallacyData = getFallacyInstance(s.fallacy[0]);
                // Skip if fallacy type not in config
                if (!fallacyData) {
                    return(
                        <Text
                            id={i+"-news-sentence-"+paragraphID}
                            key={i+"-news-sentence-"+paragraphID}
                        >{s.sentence} </Text>
                    );
                }
                const fallacyName = fallacyData.name;
                const fallacyColor = fallacyData.color;
                const fallacyAbbrev = s.fallacy[0];
                // Check if THIS sentence belongs to an open instance
                const sentenceNum = s.index + 1;  // Convert to 1-based to match JSON data
                const open = Object.keys(fallacyChatList).some(key => {
                    const instance = fallacyChatList[key];
                    return instance?.fallacyCode === s.fallacy[0] &&
                           instance?.open &&
                           instance?.sentences?.includes(sentenceNum);
                });
                const inlineStyle = !open ? css`
                padding-top: 1.5px;
                padding-bottom: 1.5px;
                padding-left: 6px;
                padding-right: 6px;
                border: 2px solid;
                border-color: ${fallacyColor};
                border-width: 0 0 2px 0;
                border-radius: .25rem;
                cursor: pointer;
                &:hover {
                    background-color: ${fallacyData.rgbBG};
                    border-color: ${fallacyData.rgbBD};
                }
                ` : css`
                padding-top: 1.5px;
                padding-bottom: 1.5px;
                padding-left: 6px;
                padding-right: 6px;
                border: 2px solid;
                border-color: ${fallacyColor};
                border-width: 0 0 2px 0;
                border-radius: .25rem;
                cursor: pointer;
                background-color: ${fallacyData.rgbBG};
                border-color: ${fallacyData.rgbBD};
                `
                //console.log(open);
                return(
                    <Tooltip title="click to see the detailed explanation" key={"Tootip"+i+paragraphID}>
                    <span id={i+"-news-sentence-"+paragraphID}
                    key={i+"-news-sentence-"+paragraphID}
                    data-fallacy={s.fallacy[0]}
                    data-sentence-index={s.index}
                    data-paragraph-index={paragraphID}
                    onClick={e=>handleSentenceClick(paragraphID, s.fallacy[0], s.index)}
                    className={
                        cx(inlineStyle)
                    }>
                        {s.sentence}
                    </span>
                    </Tooltip>
                );
            }else{
                // Filter to only fallacies that exist in config (check via instance lookup)
                const validFallacies = s.fallacy.filter(fa => getFallacyInstance(fa));
                if (validFallacies.length === 0) {
                    return(
                        <Text
                            id={i+"-news-sentence-"+paragraphID}
                            key={i+"-news-sentence-"+paragraphID}
                        >{s.sentence} </Text>
                    );
                }
                const fallacyColor = validFallacies.map(fa => getFallacyInstance(fa)?.color || '#ccc');
                // Check if THIS sentence belongs to an open instance of any of these fallacies
                const sentenceNum = s.index + 1;  // Convert to 1-based
                const activeFallacy = validFallacies.filter(fa =>
                    Object.keys(fallacyChatList).some(key => {
                        const instance = fallacyChatList[key];
                        return instance?.fallacyCode === fa &&
                               instance?.open &&
                               instance?.sentences?.includes(sentenceNum);
                    })
                );
                const activeData = activeFallacy.length > 0 ? getFallacyInstance(activeFallacy[0]) : null;
                const inlineStyle = activeData ? css`
                    border-bottom: 2px solid ${fallacyColor[0]};
                    box-shadow:
                    0 2px 0 0px white,
                    0 5px 0 -1px ${fallacyColor[1] || fallacyColor[0]};
                    background-color: ${activeData.rgbBG};
                    border-color: ${activeData.rgbBD};
                `  : css`
                    border-bottom: 2px solid ${fallacyColor[0]};
                    box-shadow:
                    0 2px 0 0px white,
                    0 5px 0 -1px ${fallacyColor[1] || fallacyColor[0]};
                `;
                return(
                <Tooltip title="click to see the explanation" key={"Tootip"+i+paragraphID}>
                    <span
                    id={i+"-news-sentence-"+paragraphID}
                    key={i+"-news-sentence-"+paragraphID}
                    data-fallacy={validFallacies.join(',')}
                    data-sentence-index={s.index}
                    data-paragraph-index={paragraphID}
                    onClick={e=>handleSentenceClick(paragraphID, validFallacies[0], s.index)}
                    className={cx(inlineStyle, css`cursor: pointer;`)}
                    >
                        {s.sentence}
                    </span>
                </Tooltip>
                );
            }
        })}
        </>
    );
}