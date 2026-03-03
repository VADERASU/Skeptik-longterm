import { useState } from "react";
import { Modal, Button, Typography, Switch, Space } from "antd";
import { EyeOutlined, EyeInvisibleOutlined, TagsOutlined, StopOutlined } from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

export function SplashScreen({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [visible, setVisible] = useState(true);
    const [showGazeOverlay, setShowGazeOverlay] = useState(false);
    const [hideAnnotations, setHideAnnotations] = useState(false);

    const handleOk = () => {
        if (currentStep === 1) {
            setCurrentStep(2);
        } else {
            setVisible(false);
            onComplete({ showGazeOverlay, hideAnnotations });
        }
    };

    const renderStep1 = () => (
        <div style={{ textAlign: "center", padding: "20px 40px" }}>
            <img
                src={process.env.PUBLIC_URL + "/img/skeptik logo.png"}
                alt="Skeptik Logo"
                style={{ width: 150, marginBottom: 30 }}
            />
            <Paragraph style={{ fontSize: 18, textAlign: "left" }}>
                Skeptik uses artificial intelligence to flag possible fallacies
                (errors in reasoning) in text appearing on a web page.
            </Paragraph>
            <Paragraph style={{ fontSize: 18, textAlign: "left" }}>
                AI can make mistakes, so Skeptik only suggests where there{" "}
                <Text strong>may be</Text> a fallacy and what kind it is.
            </Paragraph>
            <Paragraph style={{ fontSize: 18, textAlign: "left" }}>
                It is important that you re-examine the text and decide for
                yourself whether it is right.
            </Paragraph>
        </div>
    );

    const renderStep2 = () => (
        <div style={{ textAlign: "center", padding: "20px 40px" }}>
            <img
                src={process.env.PUBLIC_URL + "/img/skeptik_example.png"}
                alt="Skeptik Example"
                style={{ width: "100%", maxWidth: 700, marginBottom: 30, border: "1px solid #ddd", borderRadius: 8 }}
            />
            <Paragraph style={{ fontSize: 18, textAlign: "left" }}>
                When you see highlighted text, Skeptik shows you the category of fallacy
                it thinks is present.
            </Paragraph>
            <Paragraph style={{ fontSize: 18, textAlign: "left" }}>
                When you click the text, it shows a more detailed explanation of the
                fallacy it thinks is present.
            </Paragraph>
            <Paragraph style={{ fontSize: 18, textAlign: "left" }}>
                We recommend that you read the explanation, then read the text again to
                see if you think it fits the explanation.
            </Paragraph>

            <div style={{
                marginTop: 30,
                padding: 16,
                backgroundColor: "#f5f5f5",
                borderRadius: 8,
                textAlign: "left"
            }}>
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    {/* Control Group Option */}
                    <Space align="center" size="middle" style={{ width: "100%" }}>
                        {hideAnnotations ? <StopOutlined style={{ fontSize: 20, color: "#999" }} /> : <TagsOutlined style={{ fontSize: 20, color: "#3d5a6c" }} />}
                        <div style={{ flex: 1 }}>
                            <Text strong>Control Group Mode</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {hideAnnotations
                                    ? "Annotations are hidden - reading without AI assistance"
                                    : "Annotations are visible - fallacy highlights and explanations shown"
                                }
                            </Text>
                        </div>
                        <Switch
                            checked={hideAnnotations}
                            onChange={setHideAnnotations}
                        />
                    </Space>

                    {/* Eye Tracking Option */}
                    <Space align="center" size="middle" style={{ width: "100%" }}>
                        {showGazeOverlay ? <EyeOutlined style={{ fontSize: 20 }} /> : <EyeInvisibleOutlined style={{ fontSize: 20 }} />}
                        <div style={{ flex: 1 }}>
                            <Text strong>Show Eye Tracking Overlay</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {showGazeOverlay
                                    ? "A dot will show where you're looking (visible during reading)"
                                    : "Eye tracking runs in background without visible indicator"
                                }
                            </Text>
                        </div>
                        <Switch
                            checked={showGazeOverlay}
                            onChange={setShowGazeOverlay}
                        />
                    </Space>
                </Space>
            </div>
        </div>
    );

    return (
        <Modal
            open={visible}
            footer={null}
            closable={false}
            centered
            width={currentStep === 1 ? 600 : 800}
        >
            {currentStep === 1 ? renderStep1() : renderStep2()}
            <div style={{ textAlign: "center", marginTop: 20, marginBottom: 20 }}>
                <Button
                    type="primary"
                    size="large"
                    onClick={handleOk}
                    style={{
                        backgroundColor: "#3d5a6c",
                        borderColor: "#3d5a6c",
                        minWidth: 120,
                        height: 45,
                        fontSize: 16
                    }}
                >
                    OK
                </Button>
            </div>
        </Modal>
    );
}
