<?php

/**
 * Created by PhpStorm.
 * @property string client_secret
 * @author egomez-prompsit egomez@prompsit.com
 * Date: 29/05/18
 * Time: 12.17
 *
 */

class Engines_IADAATPA extends Engines_AbstractEngine {

    protected $_config = array(
            'segment'     => null,
            'source'      => null,
            'target'      => null,
            'key'     => null,
    );

    public function __construct($engineRecord) {
        parent::__construct($engineRecord);
        if ( $this->engineRecord->type != "MT" ) {
            throw new Exception( "Engine {$this->engineRecord->id} is not a MT engine, found {$this->engineRecord->type} -> {$this->engineRecord->class_load}" );
        }
    }

    /**
     * @param $lang
     *
     * @return mixed
     * @throws Exception
     */
    protected function _fixLangCode( $lang ) {
        $separate_pos=strpos($lang,"-");
        $normalise=substr($lang,0,$separate_pos);

        return $lang;
    }

    /**
     * @param $rawValue
     *
     * @return array
     */
    protected function _decode( $rawValue ){
        $all_args =  func_get_args();
        
        $original="";
        if( is_string( $rawValue ) ) {
            /*$original = json_decode( $all_args[1]["data"] , true );
            $decoded = json_decode( $rawValue, true );
            $decoded = array(
                    'data' => array(
                            "translations" => array(
                                    array( 'translatedText' =>  $this->_resetSpecialStrings( $decoded[ "text" ] ) )
                            )
                    )
            );*/
            $all_args[0] = json_decode( $all_args[0] , true );
            $decoded = json_decode( $rawValue, true );
            $original=$decoded["data"]["segments"]["segment01"]["segment"];

            $decoded = array(
                'data' => array(
                    "translations" => array(
                        array( 'translatedText' =>  $this->_resetSpecialStrings( $decoded["data"]["segments"]["segment01"]["translation"] ) )
                        )
                    )
                );
            
        } else {
            $decoded = $rawValue; // already decoded in case of error
        }

        $mt_result = new Engines_Results_MT( $decoded );

        if ( $mt_result->error->code < 0 ) {
            $mt_result = $mt_result->get_as_array();
            $mt_result['error'] = (array)$mt_result['error'];
            return $mt_result;
        }

        $mt_match_res = new Engines_Results_MyMemory_Matches(
                $this->_preserveSpecialStrings( $original),
                $mt_result->translatedText,
                100 - $this->getPenalty() . "%",
                "MT-" . $this->getName(),
                date( "Y-m-d" )
        );

        $mt_res = $mt_match_res->get_as_array();

        return $mt_res;

    }

    public function get( $_config ) {
        $_config[ 'segment' ] = $this->_preserveSpecialStrings( $_config[ 'segment' ] );

        $parameters = array();
        if (  $this->client_secret != '' && $this->client_secret != null ) {
            $parameters[ 'token' ] = $this->client_secret;
        }
        $parameters['source'] = $this->_fixLangCode($_config[ 'source' ]);
        $parameters['target'] = $this->_fixLangCode($_config[ 'target' ]);
        $parameters['segments'] = array("segment01"=>$_config[ 'segment' ]);

        $this->_setAdditionalCurlParams( array(
                        CURLOPT_HTTPHEADER     => array("Content-Type: application/json"),
                        CURLOPT_POST       => true,
                        CURLOPT_RETURNTRANSFER => true,
                        CURLOPT_POSTFIELDS => json_encode( $parameters )
                )
        );
        $this->call( "translate_relative_url", $parameters, true);

        return $this->result;

    }

    public function set( $_config ) {

        //if engine does not implement SET method, exit
        return true;
    }

    public function update( $config ) {

        //if engine does not implement UPDATE method, exit
        return true;
    }

    public function delete( $_config ) {

        //if engine does not implement DELETE method, exit
        return true;

    }

}