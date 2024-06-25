import {useEffect, useState} from "react";
import { Select, Button } from "antd";

export function NavBar ({setSelectedCase, activeArticle}) {
    
    return(
        <>
            <span className="logo" href="#"
                style={{float: 'left'}}
            >
                Skeptik
            </span>

            <Select 
                defaultValue={0}
                size="small"
                options={[
                    {value: 0, label: "Case 1"},
                    {value: 1, label: "Case 2"},
                    {value: 2, label: "Case 3", disabled: false,}
                ]}
                onChange={e=>setSelectedCase(e)}
                style={{
                    width: 200,
                    float: 'left',
                    marginTop: 10
                }}
            />

            <span
                style={{
                    float: 'left', color: "white", lineHeight: 3,
                    marginLeft: 20
                }}
            >
                <b>Case Title: {activeArticle.title}</b>
            </span>

        </>
    );
}